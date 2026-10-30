# dsh-dots test candidate

Version: `1.0.10-uiqa.20261029.1`. This is an installable test candidate, not a formal release. Windows native acceptance is pending.

1. Download `dsh-dots-1.0.10-uiqa.20261029.1.tgz` from this directory at the same pinned commit as this document.
2. Verify SHA-256: `50d04fc3f3fa56447a0df940a99bd7a469b195cee3f0f2d8679a95bad4809acd` (15551 bytes).
3. Back up the DSH profile using supported methods and use a disposable test profile where available.
4. In DSH Desktop, open **Plugins → Add plugin** and select the downloaded local TGZ. Do not substitute the older official-release links in the package README. Record the installed plugin version and Host version.
5. Validate native UI, normal operations, cancellation/error recovery, persistence after restart, and disable/re-enable behavior. Record PASS, FAIL, BLOCKED, and NOT RUN separately with sanitized evidence.

The archive is byte-for-byte the frozen candidate. Root README changes clarify test installation and preserve current repository support links; they do not change archive bytes. `manifest.json` contains installed payload identities. Do not run optional Host archive patching, binary repair, or account actions without separate approval. Existing source tests include synthetic fixtures; their results do not certify actual native services, account login, or other operating systems.
