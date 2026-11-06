"""Compare captured actual Superset rows with independently reconciled SQL/API."""
import json
from pathlib import Path

root = Path(__file__).parent
evidence = json.loads((root / "reconciliation.json").read_text())
for filename, index in (("dashboard", 0), ("harbor", 1)):
    actual = json.loads((root / f"{filename}-results.json").read_text())
    expected = evidence[index]
    for chart, metric in enumerate(("stakes", "payouts", "ggr", "players"), 1):
        assert actual[str(chart)] == [{metric: int(expected["summary"][metric])}]
    assert [d["ggr"] for d in actual["5"]] == [int(d["ggr"]) for d in expected["trend"]]
    assert {d["provider"]: d["change"] for d in actual["6"]} == {
        d["provider"]: int(d["change"]) for d in expected["contributions"]
    }
    print(filename, "six captured Superset panels match independent SQL/API")
