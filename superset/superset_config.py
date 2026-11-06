"""Loopback-only development baseline; all secrets/state are supplied externally."""
import os
SECRET_KEY = os.environ["SUPERSET_SECRET_KEY"]
SQLALCHEMY_DATABASE_URI = "sqlite:////tmp/opslens-superset/metadata.db"
WTF_CSRF_ENABLED = True
TALISMAN_ENABLED = False  # local HTTP on loopback only
FEATURE_FLAGS = {"ENABLE_TEMPLATE_PROCESSING": True}
# In-process local caches avoid Redis and the metastore cache backend.
CACHE_CONFIG = {"CACHE_TYPE": "SimpleCache", "CACHE_DEFAULT_TIMEOUT": 300}
DATA_CACHE_CONFIG = CACHE_CONFIG.copy()
FILTER_STATE_CACHE_CONFIG = CACHE_CONFIG.copy()
EXPLORE_FORM_DATA_CACHE_CONFIG = CACHE_CONFIG.copy()
