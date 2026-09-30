# CrowdSec deployment hook

The local Compose stack does not require CrowdSec. Caddy writes JSON access logs to the named `caddy_logs` volume, which gives a future CrowdSec acquisition container a stable log source without changing the application or storage code.

For a VPS rollout, add the CrowdSec agent with the Caddy collection, mount `caddy_logs` read-only, persist `/var/lib/crowdsec/data`, then add a supported Caddy remediation bouncer or put a CrowdSec bouncer at the network edge. Keep the Local API private to the Compose network, issue a separate bouncer credential, and test decisions in a staging environment before enforcing blocks. The stock Caddy image in this repository is not built with a CrowdSec module, so the hook is detection-ready but does not block traffic by itself.
