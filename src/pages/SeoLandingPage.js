import React from 'react';
import { Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SEO_PAGES, SITE_URL, SOCIAL_PROFILE_URLS } from '../data/marketingContent';
import { MarketingFooter, MarketingNav } from './MarketingLayout';

export default function SeoLandingPage({ path }) {
  const page = SEO_PAGES.find(item => item.path === path);
  if (!page) return <Navigate to="/" replace />;

  const pageUrl = `${SITE_URL}${page.path}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.title,
      url: pageUrl,
      description: page.description,
      about: page.primaryKeyword,
      isPartOf: {
        '@type': 'WebSite',
        name: 'AssessArc',
        url: SITE_URL,
      },
      publisher: {
        '@type': 'Organization',
        name: 'AssessArc',
        url: SITE_URL,
        sameAs: SOCIAL_PROFILE_URLS,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: page.title,
          item: pageUrl,
        },
      ],
    },
  ];

  return (
    <div className="home-page seo-page">
      <Helmet>
        <title>{page.metaTitle}</title>
        <meta name="description" content={page.description} />
        <meta name="keywords" content={[page.primaryKeyword, ...page.supportingKeywords].join(', ')} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="AssessArc" />
        <meta property="og:title" content={page.metaTitle} />
        <meta property="og:description" content={page.description} />
        <meta property="og:url" content={pageUrl} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={page.metaTitle} />
        <meta name="twitter:description" content={page.description} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <MarketingNav />
      <main>
        <section className="seo-hero">
          <div>
            <div className="home-eyebrow">{page.eyebrow}</div>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
            <div className="seo-keywords" aria-label="Related search topics">
              {page.supportingKeywords.map(keyword => <span key={keyword}>{keyword}</span>)}
            </div>
            <div className="home-hero-actions">
              <a className="home-primary-btn" href="/?auth=signin">Start free practice</a>
              <a className="home-secondary-btn" href="#faq">Read FAQs</a>
            </div>
          </div>
          <aside className="seo-hero-panel" aria-label="AssessArc benefits">
            <span>Best for</span>
            <b>{page.audience}</b>
            <span>Outcome</span>
            <p>{page.outcome}</p>
          </aside>
        </section>

        <section className="seo-section">
          <div className="home-section-heading">
            <span>{page.primaryKeyword}</span>
            <h2>Why candidates use AssessArc</h2>
          </div>
          <div className="seo-info-grid">
            {page.sections.map(([title, body]) => (
              <article className="seo-info-card" key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="seo-section seo-process">
          <div className="home-section-heading">
            <span>How It Works</span>
            <h2>Practice, review, improve, repeat</h2>
          </div>
          <div className="home-step-grid">
            {[
              ['01', 'Sign in', 'Create or access your AssessArc account.'],
              ['02', 'Upload resume', 'Let Sarah AI personalize questions around your background.'],
              ['03', 'Answer by voice', 'Practice in a real interview-style flow.'],
              ['04', 'Review feedback', 'Use scores and insights to improve the next session.'],
            ].map(([num, title, desc]) => (
              <article className="home-step-card" key={num}>
                <b>{num}</b>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="seo-section home-faq">
          <div className="home-section-heading">
            <span>FAQ</span>
            <h2>Questions about {page.primaryKeyword}</h2>
          </div>
          <div className="home-faq-list">
            {page.faq.map(([question, answer]) => (
              <article className="home-faq-item seo-faq-static" key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </section>

      </main>
      <MarketingFooter />
    </div>
  );
}
