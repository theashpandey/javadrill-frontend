import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { SOCIAL_PROFILES } from '../data/marketingContent';

export function MarketingNav() {
  return (
    <header className="home-nav">
      <Link to="/" className="home-brand" aria-label="AssessArc home">
        <BrandLogo size={34} iconSize={26} style={{ fontSize:'20px' }} />
      </Link>
      <Link className="home-nav-cta" to="/?auth=signin">Start Free</Link>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="home-footer">
      <Link to="/" className="home-brand" aria-label="AssessArc home">
        <BrandLogo size={34} iconSize={26} />
      </Link>
      <div>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/refund">Refund</Link>
        {SOCIAL_PROFILES.map(url => (
          <a href={url} target="_blank" rel="noreferrer" key={url}>{new URL(url).hostname.replace('www.', '')}</a>
        ))}
      </div>
    </footer>
  );
}
