# Privacy Policy

Effective date: November 13, 2026

This Privacy Policy explains how the Country First browser extension (the "Extension") handles user information.

## Information Collected

The Extension does not collect personal information. No user data is transmitted to the developer or to any third party.

## Information Processed on the Device

To identify country selection fields, the Extension reads the text and attributes of list elements on web pages the user visits. This processing takes place solely within the user's browser. Page content is not recorded, retained or transmitted.

## Information Stored

The Extension stores the user's settings: the selected country, two feature options and the interface language. These settings are saved through the `chrome.storage.sync` API. Where Chrome sync is enabled, Chrome stores the settings in the user's own Google account and synchronizes them across the user's devices. The developer has no access to this data.

## Disclosure to Third Parties

The Extension does not sell, transfer or disclose user data to third parties. It makes no network requests, loads no remotely hosted code, and includes no analytics or advertising components.

## Permissions

The Extension requests the following permissions:

- `storage`, to save the settings described above.
- `scripting` and access to all websites, because country selection fields may appear on any website and in any frame. The `scripting` permission is also used to enable the keyboard shortcut in tabs that were open before the Extension was installed or updated.

## Changes to This Policy

This policy may be updated when the Extension changes. The current version is published at this address, and the effective date above reflects the most recent revision.

## Contact

Questions regarding this policy may be submitted at https://github.com/lhk79119/country-first/issues.
