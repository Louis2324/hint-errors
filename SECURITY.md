# Security Policy

## Scope

Security reports are welcome for:

- the `hint-errors` npm package and its published tarball;
- the GitHub Actions workflows used to test and release the package; and
- the documentation and interactive playground hosted from this repository.

The playground is a browser-side simulation. It does not execute arbitrary
Node.js, access a visitor's filesystem, or send submitted code, errors, or
inputs to an API. The page may load visual assets such as web fonts.

## Reporting a vulnerability

Please do not disclose credentials, private source code, customer data, or a
fully reproducible security issue in a public GitHub issue.

Use GitHub's private security-advisory reporting flow when it is available:

<https://github.com/Louis2324/hint-errors/security/advisories/new>

If that flow is unavailable, contact a maintainer privately through their
GitHub profile and include:

- the affected version or commit;
- a concise description of the impact;
- reproduction steps or a minimal proof of concept; and
- any suggested mitigation.

Please allow maintainers reasonable time to investigate and release a fix
before making the report public.

## User-submitted error data

When reporting an ordinary bug, redact API keys, tokens, passwords, private
paths, internal hostnames, customer data, and proprietary source code from
stack traces and logs before posting them.

## Supported versions

Security fixes are normally made against the latest published version. Users
should upgrade to the latest version before reporting an issue that may
already be fixed.
