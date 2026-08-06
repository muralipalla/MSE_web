import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <div className="footer-brand">MSE Learning Lab</div>
          <p>
            A modular, open learning space for exploring materials from atomic
            structure to engineering performance.
          </p>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/learn">Teaching content</Link>
          <Link href="/visualizations">Visualizations</Link>
          <Link href="/simulations">Simulations</Link>
        </div>
        <div>
          <h2>Practice</h2>
          <Link href="/quizzes">Build a quiz</Link>
          <Link href="/question-bank">Browse questions</Link>
          <Link href="/glossary">Glossary</Link>
        </div>
        <div>
          <h2>For authors</h2>
          <p>
            Lessons, questions, and interactive metadata live as reviewable
            content files in the project repository.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>Materials Science &amp; Engineering</span>
        <span>Designed for accessible self-learning</span>
      </div>
    </footer>
  );
}
