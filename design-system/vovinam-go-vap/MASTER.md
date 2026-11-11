# Vovinam Gò Vấp — Design system

UI/UX Pro Max search: sports club, hero-centric, energetic block layout. The retrieved red palette and display font were unsuitable for the owner's explicit blue brand and Vietnamese parent audience; these project choices supersede those recommendations.

- Primary `#0063cd`, navy `#092b50`, text `#19334d`, muted `#63758a`, warm neutral `#f8f9f6`, white cards. Yellow is a small decorative accent only.
- Be Vietnam Pro with system sans-serif fallback; Vietnamese diacritics must remain legible. Use sentence case, large headlines, restrained motion.
- Public page: introduction and trial registration are the main tasks. Hero → values → introduction → class schedule → coaches/achievements → gallery → news → registration/contact.
- Dashboard: white sidebar, pale workspace, compact metric cards, clear financial status text. Responsive drawer on small screens; tables scroll within their containers.
- Use Lucide SVG icons, explicit labels, visible keyboard focus, semantic buttons, accessible modal focus management, feedback for loading/error/success, reduced-motion support.
- No invented achievements, coach biographies or testimonials. Real logo and photographs are supplied through the admin editor. The initial V wordmark and dojo illustration are temporary design assets.
- Test at 375, 768, 1024 and 1440px. Touch targets on phones at least 44px; readable 16px form inputs to prevent iOS zoom.
