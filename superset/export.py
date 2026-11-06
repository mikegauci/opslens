"""Export the actual saved dashboard, replacing connection details before writing."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import yaml
from flask import g
from superset.app import create_app

app = create_app()
with app.app_context():
    from superset import db, security_manager
    from superset.models.dashboard import Dashboard
    from superset.commands.dashboard.export import ExportDashboardsCommand
    g.user = security_manager.find_user(username="baseline")
    dashboard = db.session.query(Dashboard).filter_by(slug="opslens-baseline").one()
    files = {}
    for name, content in ExportDashboardsCommand([dashboard.id]).run():
        payload = yaml.safe_load(content())
        if name.startswith("databases/"):
            payload = {key: payload[key] for key in ("database_name", "uuid", "version")}
            # Import requires a dialect; replace locally in a private copy before import.
            payload["sqlalchemy_uri"] = "postgresql://localhost/RECONNECT_LOCALLY"
            payload["allow_dml"] = False
            payload["expose_in_sqllab"] = False
        files[name] = yaml.safe_dump(payload, sort_keys=False)
    output = Path("superset/baseline.zip")
    with ZipFile(output, "w", ZIP_DEFLATED) as bundle:
        for name, content in files.items():
            bundle.writestr(f"opslens_baseline/{name}", content)
    print(f"Saved {len(files)} sanitised configuration files to {output}")
