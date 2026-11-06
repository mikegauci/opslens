"""Create six actual Superset charts from the independent SQL; never export a URI."""
import json
import os
from pathlib import Path
from superset.app import create_app

app = create_app()
with app.app_context():
    from superset import db, security_manager
    import secrets
    password_file = Path("/tmp/opslens-superset/admin-password")
    if not security_manager.find_user(username="baseline"):
        password = secrets.token_urlsafe(24)
        password_file.write_text(password)
        password_file.chmod(0o600)
        security_manager.add_user("baseline", "Local", "Baseline", "baseline@localhost.invalid", security_manager.find_role("Admin"), password=password)
    from superset.models.core import Database
    from superset.connectors.sqla.models import SqlaTable
    from superset.models.slice import Slice
    from superset.models.dashboard import Dashboard
    database = db.session.query(Database).filter_by(database_name="OpsLens read only").one_or_none()
    if database is None:
        database = Database(database_name="OpsLens read only", sqlalchemy_uri=os.environ["SUPERSET_DATABASE_URL"], expose_in_sqllab=False, allow_dml=False)
        db.session.add(database)
        db.session.flush()
    scope = dict(from_date="2026-09-22T00:00:00Z", to_date="2026-09-29T00:00:00Z", brand=os.environ.get("BASELINE_BRAND") or None, provider=os.environ.get("BASELINE_PROVIDER") or None)
    assert scope["brand"] in (None,"harbor","summit")
    assert scope["provider"] in (None,"nova","orbit","pulse")
    datasets = {}
    for kind in ("summary", "trend", "contributions"):
        sql = Path(f"superset/sql/{kind}.sql").read_text()
        for key, expression in {"from": "'{{ from_date }}'", "to": "'{{ to_date }}'", "brand": "{{ \"'\" + brand + \"'\" if brand else 'NULL' }}", "provider": "{{ \"'\" + provider + \"'\" if provider else 'NULL' }}"}.items():
            sql = sql.replace(f"%({key})s", expression)
        table = db.session.query(SqlaTable).filter_by(table_name=f"opslens_{kind}").one_or_none()
        if table is None:
            table = SqlaTable(table_name=f"opslens_{kind}", database=database, sql=sql, template_params=json.dumps(scope))
            db.session.add(table)
            db.session.flush()
            table.fetch_metadata()
        table.sql = sql
        table.template_params = json.dumps(scope)
        datasets[kind] = table
    charts = []
    for title, kind, column, viz in [
        ("Settled stakes · EUR minor units", "summary", "stakes", "big_number_total"),
        ("Settled payouts · EUR minor units", "summary", "payouts", "big_number_total"),
        ("GGR · EUR minor units", "summary", "ggr", "big_number_total"),
        ("Active settled players", "summary", "players", "big_number_total"),
        ("Daily GGR · UTC · EUR minor units", "trend", "ggr", "echarts_timeseries_line"),
        ("Provider GGR change · EUR minor units", "contributions", "change", "echarts_timeseries_bar"),
    ]:
        table = datasets[kind]
        metric = dict(expressionType="SQL", sqlExpression=f"SUM({column})", label=column, optionName=f"metric_{column}")
        params = dict(viz_type=viz, datasource=f"{table.id}__table", metric=metric, metrics=[metric], adhoc_filters=[], row_limit=1000, time_range="No filter", y_axis_format=",d")
        if kind != "summary":
            params.update(x_axis="day" if kind == "trend" else "provider", groupby=[], order_desc=False)
        chart = db.session.query(Slice).filter_by(slice_name=title).one_or_none()
        if chart is None:
            chart = Slice(slice_name=title, datasource_id=table.id, datasource_type="table", viz_type=viz, params=json.dumps(params))
            db.session.add(chart)
        charts.append(chart)
    dashboard = db.session.query(Dashboard).filter_by(slug="opslens-baseline").one_or_none()
    if dashboard is None:
        dashboard = Dashboard(dashboard_title="OpsLens · synthetic · UTC · 22–28 Sep 2026", slug="opslens-baseline", published=True)
        db.session.add(dashboard)
    dashboard.owners = [security_manager.find_user(username="baseline")]
    dashboard.dashboard_title = "OpsLens · synthetic · UTC · 22–28 Sep 2026" + (" · " + scope["brand"] if scope["brand"] else "")
    dashboard.slices = charts
    db.session.flush()
    position = {"DASHBOARD_VERSION_KEY": "v2", "ROOT_ID": {"id":"ROOT_ID","type":"ROOT","children":["GRID_ID"]}, "GRID_ID":{"id":"GRID_ID","type":"GRID","children":["ROW_CARDS","ROW_CHARTS"],"parents":["ROOT_ID"]}}
    for row, items in [("ROW_CARDS",charts[:4]),("ROW_CHARTS",charts[4:])]:
        position[row] = dict(id=row,type="ROW",children=[],parents=["ROOT_ID","GRID_ID"],meta={"background":"BACKGROUND_TRANSPARENT"})
        for chart in items:
            key=f"CHART_{chart.id}"
            position[row]["children"].append(key)
            position[key]=dict(id=key,type="CHART",children=[],parents=["ROOT_ID","GRID_ID",row],meta=dict(chartId=chart.id,width=3 if row=="ROW_CARDS" else 6,height=50,sliceName=chart.slice_name))
    dashboard.position_json=json.dumps(position)
    db.session.commit()
    print(f"Dashboard /superset/dashboard/{dashboard.id}/; six charts created")
