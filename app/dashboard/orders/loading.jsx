'use client';

export default function OrdersLoading() {
  return (
    <main className="orders-page" aria-busy="true">
      <section className="orders-header">
        <div>
          <h1>Lade Aufträge…</h1>
          <p className="orders-subtitle">Bitte einen Moment Geduld – die aktuellsten Daten werden geladen.</p>
        </div>
        <span className="skeleton-chip" aria-hidden="true" />
      </section>

      <div className="filters skeleton" aria-hidden="true">
        <div className="filter-group">
          <span className="skeleton-bar" />
          <span className="skeleton-input" />
        </div>
        <div className="filter-group">
          <span className="skeleton-bar" />
          <span className="skeleton-input" />
        </div>
        <div className="filter-actions">
          <span className="skeleton-pill" />
          <span className="skeleton-pill" />
        </div>
      </div>

      <div className="table-wrapper" aria-hidden="true">
        <table>
          <thead>
            <tr>
              {[...Array(6)].map((_, idx) => (
                <th key={idx}>
                  <span className="skeleton-bar" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, rowIdx) => (
              <tr key={rowIdx}>
                {[...Array(6)].map((_, cellIdx) => (
                  <td key={cellIdx}>
                    <span className="skeleton-line" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>


    </main>
  );
}
