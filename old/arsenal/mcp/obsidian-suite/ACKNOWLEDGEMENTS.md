# Acknowledgements — upstream sources and licence boundaries

This plugin bundles source code from a third-party open-source project. That code
remains under its own licence; this file records exactly what came from where, so
the two licence layers stay separable.

## Upstream: `mcp-obsidian` 0.2.2 (MIT)

`mcp/src/mcp_obsidian/` (`__init__.py`, `obsidian.py`, `server.py`, `tools.py`)
is a copy of the upstream **`mcp-obsidian` 0.2.2** package, distributed under the
**MIT** licence.

| Field | Value |
| --- | --- |
| Project | `mcp-obsidian` — "MCP server to work with Obsidian via the remote REST plugin" |
| Version | 0.2.2 |
| Author | Markus Pfundstein `<markus@life-electronic.nl>` |
| Licence | MIT |
| Licence text | `mcp/LICENSE.upstream` (verbatim upstream `LICENSE`, 1074 bytes, unmodified) |
| Vendored at | `mcp/src/mcp_obsidian/` |
| Upstream requirements | `mcp>=1.1.0,<2.0.0`, `python-dotenv>=1.0.1`, `requests>=2.32.3` |

### What was changed

The upstream `src/` tree carries **exactly one local patch**, and nothing else was
touched — no reformatting, no renaming, no logic changes:

**Patch #1 — `obsidian.py`: explicit `Markdown-Patch-Version: 1` header**

Header-based `PATCH` against **Local REST API 5.1.0** now requires the patch format
to be named explicitly. Without the header the server answers
`40084 "Header-based PATCH targeting is ambiguous..."`; with
`Markdown-Patch-Version: 1` the request returns 200, and with `2` it demands a
percent-encoded JSON target instead. `1` preserves this client's existing 1.x
header semantics, so behaviour is otherwise unchanged.

The change is confined to the header dict in the `patch_content` helper and is
marked in-source with a comment beginning `# obsidian-agent local patch #1`.

Everything else under `mcp/` — the REST entry (`server_entry.py`), the CLI bridge
(`obsidian_cli_server.py`) and the manifests — is original work of this plugin and
is **not** derived from the upstream package.

### Repository provenance

The upstream folder arrived without VCS metadata (no `.git`), so the original
repository URL could not be verified against this copy. The author, version and
dependency pins above were read from the upstream `pyproject.toml` shipped
alongside the source; the licence text was taken from the upstream `LICENSE`.
If you redistribute this plugin, keep `mcp/LICENSE.upstream` next to the vendored
package — MIT requires the copyright notice and permission notice to travel with
all copies or substantial portions of the software.

## Not covered by this file

Skills, references, evidence documents and the two MCP entry scripts are original
to this plugin. Any third-party material quoted inside those files keeps its own
attribution at the point of quotation.
