## 2023-10-27 - Typed Error Taxonomy & Failure Semantics
**Learning:** Precise error classification (Domain, Boundary, Infra) allows the Presenter layer to provide meaningful user feedback while ensuring business invariants are strictly enforced. Standardizing log structure with 'error_class' and 'retryable' flags enables automated observability and easier debugging of transient vs permanent failures.
**Action:** Always implement a BaseError with 'retryable' and 'errorClass' properties for any new service to maintain consistent failure semantics across the application.
