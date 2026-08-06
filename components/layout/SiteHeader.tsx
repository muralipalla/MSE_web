import Link from "next/link";

const primaryLinks = [
  { href: "/learn", label: "Learn" },
  { href: "/visualizations", label: "Visualize" },
  { href: "/simulations", label: "Simulate" },
  { href: "/quizzes", label: "Practice" },
  { href: "/question-bank", label: "Question bank" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/" aria-label="MSE Learning Lab home">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-atom brand-atom-one" />
            <span className="brand-atom brand-atom-two" />
            <span className="brand-atom brand-atom-three" />
          </span>
          <span className="brand-copy">
            <strong>MSE</strong>
            <span>Learning Lab</span>
          </span>
        </Link>
        <nav className="primary-nav" aria-label="Primary navigation">
          {primaryLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <Link className="header-cta" href="/paths/introduction-to-mse">
          Start a learning path
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </header>
  );
}
