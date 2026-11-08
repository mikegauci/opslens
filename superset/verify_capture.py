"""Compare captured actual Superset rows with independently reconciled SQL/API."""
import json
from datetime import datetime
from pathlib import Path

root = Path(__file__).parent
evidence = json.loads((root / "reconciliation.json").read_text())
for filename, index in (("dashboard", 0), ("harbor", 1), ("nova", 2)):
    actual = json.loads((root / f"{filename}-results.json").read_text())
    expected = evidence[index]
    for chart, metric in enumerate(("stakes", "payouts", "ggr", "players"), 1):
        assert actual[str(chart)] == [{metric: int(expected["summary"][metric])}]
    assert actual["5"] == [
        {
            "day": int(datetime.fromisoformat(row["day"].replace("Z", "+00:00")).timestamp() * 1000),
            "ggr": int(row["ggr"]),
        }
        for row in expected["trend"]
    ]
    assert {d["provider"]: d["change"] for d in actual["6"]} == {
        d["provider"]: int(d["change"]) for d in expected["contributions"]
    }
    print(filename, "six captured Superset panels match independent SQL/API")
