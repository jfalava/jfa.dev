# Keweke

A small, shareable shopping-list app for friends.

Lists use UUID7 identifiers so a list can be shared directly as a URL. This package currently contains the TanStack Start UI scaffold and a server-only UUID7 list-id function. Durable Object persistence and the `/keweke` router mount will be wired separately through Alchemy.

The app routes are `/keweke/` for the empty shell and `/keweke/:listId` for a loaded list. The current list table is local scaffold state until the Durable Object data layer is added.
