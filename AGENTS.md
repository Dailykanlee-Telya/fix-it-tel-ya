# Architecture rules

- KVA print documents consume the current estimate's ordered line items, and creation/editing invalidates the document query so printed prices cannot remain stale.