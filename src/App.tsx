import { useEffect, useState, type ComponentType } from "react";
import ErrorBoundary from "@components/shared/ErrorBoundary";
import SkipNavLink from "@components/shared/SkipNavLink";
import ResetSession from "@components/shared/ResetSession";
import Configure from "@pages/Configure";
import Home from "@pages/Home";
import ReviewSession from "@pages/ReviewSession";
import ReviewSummary from "@pages/ReviewSummary";
import TestResults from "@pages/TestResults";
import TestSession from "@pages/TestSession";
import { useSession } from "@store/SessionStore";

const routes = {
  "#/": Home,
  "#/configure": Configure,
  "#/review": ReviewSession,
  "#/review/summary": ReviewSummary,
  "#/test": TestSession,
  "#/test/results": TestResults,
} satisfies Record<string, ComponentType>;

type Route = keyof typeof routes;

function isRoute(hash: string): hash is Route {
  return hash in routes;
}

function getHash(): string {
  return window.location.hash || "#/";
}

function App() {
  const [hash, setHash] = useState(getHash);
  const { notice, dispatch } = useSession();
  const route = isRoute(hash) ? hash : "#/";
  const Page = routes[route];

  useEffect(() => {
    const onHashChange = () => setHash(getHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!isRoute(hash)) {
      window.location.hash = "#/";
    }
  }, [hash]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <SkipNavLink />
      <header className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-8">
        <nav aria-label="Main navigation" className="flex flex-wrap gap-4">
          <a
            href="#/"
            aria-current={route === "#/" ? "page" : undefined}
            className="rounded py-2 font-semibold text-blue-800 underline"
          >
            Home
          </a>
          <a
            href="#/configure"
            aria-current={route === "#/configure" ? "page" : undefined}
            className="rounded py-2 font-semibold text-blue-800 underline"
          >
            Configure session
          </a>
        </nav>
      </header>
      {notice && (
        <div
          role="status"
          className="mx-auto max-w-4xl border-b border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{notice}</p>
            <button
              type="button"
              onClick={() => dispatch({ type: "DISMISS_NOTICE" })}
              className="rounded border border-amber-700 px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-8"
      >
        <ResetSession key={`reset:${route}`} />
        <ErrorBoundary key={`page:${route}`}>
          <Page />
        </ErrorBoundary>
      </main>
      <footer className="mx-auto w-full max-w-5xl border-t border-gray-200 px-4 py-4 text-sm text-gray-600 sm:px-8">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
          <p>Version {import.meta.env.VITE_APP_VERSION}</p>
          <p>
            Last updated:{" "}
            <time dateTime={import.meta.env.VITE_APP_UPDATED_DATE}>
              {import.meta.env.VITE_APP_UPDATED_DATE}
            </time>
          </p>
          <br />
          <p>
            <a
              href="https://github.com/sbobcat/atalegacy-studyapp/issues/new?template=feature_request.md"
              className="rounded text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report an issue
            </a>
          </p>
          <p>
            <a
              href="https://github.com/sbobcat/atalegacy-studyapp/issues/new?template=bug_report.md"
              className="rounded text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report an bug
            </a>
          </p>
          <p>
            Opens GitHub in a new tab. A GitHub account is required to submit
            reports.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
