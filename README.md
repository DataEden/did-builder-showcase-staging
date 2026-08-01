# DataInsideData Website

This repository contains the source of truth for [DataInsideData LLC website](https://datainsidedata.com).

[![Deploy](https://github.com/DataEden/datainsidedata-website/actions/workflows/deploy.yml/badge.svg)](https://github.com/DataEden/datainsidedata-website/actions/workflows/deploy.yml)

## Deploy architecture (two-repo model)

- **Source repo:** `datainsidedata-website` (Jekyll source)
- **Publish repo:** `did-site-public` (compiled `_site` output)
- GitHub Actions builds Jekyll and pushes output to `did-site-public` (Pages serves the site)
- Do not edit `did-site-public` manually (CI overwrites)

## 🚨 Important Notice

This repository is **NOT open source**. All content, code, and assets are proprietary to DataInsideData LLC. Cloning, copying, or redistribution without express written permission is strictly prohibited.

## License

All rights reserved. See [LICENSE.md](LICENSE.md) for details.

## Contact

For business inquiries, contact: [datainsidedata.com](contact@datainsidedata.com).
