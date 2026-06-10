# RxPulse Installer Release Plan

## Purpose

This file explains how the future RxPulse Windows installer will be published and linked from the website.

RxPulse public website:
https://rxpulsecs.com

Main download page:
https://rxpulsecs.com/download.html

## Current Status

The Windows installer is not publicly released yet.

The download page should show:
- Coming Soon
- Early testing request button
- Safety warning not to download from unofficial sources

## Recommended Low-Cost Release Method

Use GitHub Releases to host the installer file.

Do not upload large `.exe` files directly into the website repository.

## Future Release File Name

Suggested installer file name:

RxPulse-Setup-v1.0.0.exe

## Release Version Format

Use version numbers like:

v1.0.0
v1.0.1
v1.1.0

## Future GitHub Release Steps

1. Build the final Windows installer from the desktop app project.
2. Go to the main RxPulse app GitHub repo.
3. Open Releases.
4. Create a new release.
5. Tag version: v1.0.0
6. Release title: RxPulse Clinician Suite v1.0.0
7. Upload installer file:
   RxPulse-Setup-v1.0.0.exe
8. Publish release.
9. Copy the installer download link.
10. Update `download.html` on the public website with the real download link.

## Download Page Safety Text

Doctors should be told:

Download RxPulse only from the official website:
https://rxpulsecs.com

Do not install RxPulse from unofficial sources.

## Future Download Button

When installer is ready, replace Coming Soon button with:

Download for Windows

The button should link to the latest official GitHub Release asset or future official storage link.

## Future Upgrade Options

Initial:
GitHub Releases

Later:
Cloudflare R2 or other proper file storage/CDN

## Important Notes

- Do not publish the installer until login, approval, offline save, prescription writing, printing, subscription, and password reset are tested.
- Do not claim full encryption unless it is implemented and tested.
- Consider code signing certificate later to reduce Windows security warnings.
