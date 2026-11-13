# Third-Party Notices

Country First includes data derived from the projects listed below. The code of the Extension itself is not covered by these licenses.

## iso-codes and pycountry

The country names, official names and translated names in `data.js` and `data-x.js` are derived from the ISO 3166-1 data and translations of the iso-codes project, as packaged by pycountry.

- iso-codes: https://salsa.debian.org/iso-codes-team/iso-codes
- pycountry: https://github.com/pycountry/pycountry

Both projects are licensed under the GNU Lesser General Public License, version 2.1. The data in `data.js` and `data-x.js` that is derived from them is distributed under the same license. A copy of the license is provided in `LICENSES/LGPL-2.1.txt`.

The files were produced by normalizing and filtering the original names. The scripts used for this are provided in `tools/`.

## libphonenumber

The international calling codes in `data.js` are taken from the metadata of Google's libphonenumber, through the python-phonenumbers package, which is licensed under the Apache License, Version 2.0.

- libphonenumber: https://github.com/google/libphonenumber
- python-phonenumbers: https://github.com/daviddrysdale/python-phonenumbers
- License: https://www.apache.org/licenses/LICENSE-2.0
