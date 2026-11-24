import styles from "./page.module.css";

const endpoints = [
  { method: "GET", path: "/api/v1/health", purpose: "Check API liveness", access: "Public" },
  { method: "GET", path: "/api/v1/properties", purpose: "Search and filter rentals", access: "Public" },
  { method: "GET", path: "/api/v1/properties/:id", purpose: "Read property details", access: "Public" },
  { method: "GET", path: "/api/v1/properties/filter-options", purpose: "Read filter bounds and price distribution", access: "Public" },
  { method: "GET", path: "/api/v1/auth/me", purpose: "Read the signed-in profile", access: "Firebase ID token" },
  { method: "GET", path: "/api/v1/favorites", purpose: "List saved property summaries", access: "Firebase ID token" },
  { method: "GET", path: "/api/v1/favorites/ids", purpose: "List saved property IDs", access: "Firebase ID token" },
  { method: "PUT", path: "/api/v1/favorites/:propertyId", purpose: "Save a property", access: "Firebase ID token" },
  { method: "DELETE", path: "/api/v1/favorites/:propertyId", purpose: "Remove a saved property", access: "Firebase ID token" },
] as const;

export default function Home() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerContent}>
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden="true">RE</span>
            <span>Real Estate API</span>
          </div>
          <nav className={styles.nav} aria-label="API reference">
            <a href="#endpoints">Endpoints</a>
            <a href="#examples">Examples</a>
          </nav>
        </div>
      </header>

      <main className={styles.container}>
        <section className={styles.hero} aria-labelledby="api-title">
          <div>
            <p className={styles.version}>REST API / v1</p>
            <h1 id="api-title">Real Estate API</h1>
            <p className={styles.intro}>
              Browse and filter rental listings in English or Arabic, and manage favorites
              from an authenticated Flutter client.
            </p>
            <a className={styles.healthLink} href="/api/v1/health">
              Open health endpoint <span aria-hidden="true">↗</span>
            </a>
          </div>
          <figure className={styles.healthExample}>
            <figcaption><code>GET /api/v1/health</code></figcaption>
            <p>Example response</p>
            <pre><code>{JSON.stringify({ success: true, data: { status: "ok" } }, null, 2)}</code></pre>
          </figure>
        </section>

        <dl className={styles.metadata}>
          <div>
            <dt>Base path</dt>
            <dd><code>/api/v1</code></dd>
          </div>
          <div>
            <dt>Supported languages</dt>
            <dd>English <code>en</code> · <span lang="ar">العربية</span> <code>ar</code></dd>
          </div>
          <div>
            <dt>Technology</dt>
            <dd>Next.js · TypeScript · Node.js · Firebase Auth · Firestore</dd>
          </div>
        </dl>

        <section className={styles.section} id="endpoints" aria-labelledby="endpoint-title">
          <h2 id="endpoint-title">Endpoints</h2>
          <p>Protected operations require <code>Authorization: Bearer &lt;firebase-id-token&gt;</code>.</p>
          <div className={styles.tableFrame}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Method</th>
                  <th scope="col">Endpoint</th>
                  <th scope="col">Access</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map(({ method, path, purpose, access }) => (
                  <tr key={method + path}>
                    <td><span className={styles.method} data-method={method}>{method}</span></td>
                    <th scope="row"><code>{path}</code><span className={styles.purpose}>{purpose}</span></th>
                    <td>{access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section} id="examples" aria-labelledby="example-title">
          <h2 id="example-title">Request examples</h2>
          <div className={styles.examples}>
            <figure>
              <figcaption>List apartments and condos in Arabic</figcaption>
              <pre><code>{"GET /api/v1/properties?types=apartment,condo&limit=5\nAccept-Language: ar"}</code></pre>
            </figure>
            <figure>
              <figcaption>Get the signed-in user’s favorite IDs</figcaption>
              <pre><code>{"GET /api/v1/favorites/ids\nAuthorization: Bearer <firebase-id-token>"}</code></pre>
            </figure>
          </div>
        </section>
      </main>
    </>
  );
}
