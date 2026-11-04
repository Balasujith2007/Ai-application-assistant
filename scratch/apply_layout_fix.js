const fs = require('fs');
const layoutPath = 'd:/Downloads/tom and jerry images 300px height - Search Images_files/ai application assitent/ai-career-platform/app/dashboard/layout.tsx';
let content = fs.readFileSync(layoutPath, 'utf8').replace(/\r\n/g, '\n');

const newPlaceholderAndAside = `{/* Desktop Rail Placeholder - Strictly reserves 74px with explicit inline style so main content NEVER sits under sidebar */}
      <div
        className="hidden lg:block shrink-0 pointer-events-none"
        style={{ width: '74px', minWidth: '74px', maxWidth: '74px', flexBasis: '74px' }}
        aria-hidden="true"
      />

      {/* Desktop Hover-Expandable Sidebar Overlay (Expands over content without pushing layout) */}
      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        onFocusCapture={() => setIsSidebarHovered(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsSidebarHovered(false);
          }
        }}
        style={{
          width: isSidebarHovered ? '260px' : '74px',
          boxShadow: isSidebarHovered
            ? '4px 0 32px -4px rgba(0,0,0,0.13), 2px 0 8px -2px rgba(0,0,0,0.07)'
            : 'none',
          transition: 'width 220ms cubic-bezier(0.4,0,0.2,1), box-shadow 220ms cubic-bezier(0.4,0,0.2,1)',
          willChange: 'width',
        }}
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-white border-r border-gray-200/90 overflow-hidden select-none"
        aria-label="Main sidebar navigation"
      >
        {/* Logo Header - Perfectly centered on x=37px center line in 74px rail */}
        <div className="flex h-16 shrink-0 items-center border-b border-gray-100 overflow-hidden" style={{ paddingLeft: '17px', paddingRight: '17px' }}>
          <Link href="/" className="flex items-center min-w-0" aria-label="CareerAI Home">
            {/* 40px icon box: exactly centered in 74px rail (17px + 20px = 37px) */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <img
                src="/kit-logo.png"
                alt="KIT CareerAI Logo"
                className="h-8 w-8 object-contain shrink-0"
              />
            </div>
            <span
              className={\`text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap transition-all duration-200 \${
                isSidebarHovered
                  ? 'opacity-100 max-w-[160px] ml-2.5 font-bold'
                  : 'opacity-0 max-w-0 ml-0 overflow-hidden pointer-events-none'
              }\`}
              aria-hidden={!isSidebarHovered}
            >
              CareerAI
            </span>
          </Link>
        </div>

        {/* Links List - Perfectly centered on x=37px center line */}
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden py-4" style={{ paddingLeft: '17px', paddingRight: '17px' }}>
          <div className="space-y-1 mb-6">
            <p
              className={\`px-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 whitespace-nowrap transition-opacity duration-200 \${
                isSidebarHovered ? 'opacity-100' : 'opacity-0 h-3 pointer-events-none'
              }\`}
            >
              Main Menu
            </p>
            {filteredLinks.map((link) => {
              const isActive = pathname === link.path;
              const LinkIcon = ICON_MAP[link.title] || FileText;
              return (
                <div key={link.title} className="relative group/navitem">
                  <Link
                    href={link.path}
                    className={\`flex items-center rounded-xl text-sm font-medium transition-colors \${
                      isActive
                        ? 'bg-[#990024]/10 text-[#990024] font-semibold'
                        : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                    }\`}
                  >
                    {/* Uniform 40px icon box matching logo center line */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <LinkIcon
                        className={\`h-5 w-5 shrink-0 transition-colors \${
                          isActive ? 'text-[#990024]' : 'text-gray-500 group-hover/navitem:text-gray-800'
                        }\`}
                      />
                    </div>
                    <span
                      className={\`whitespace-nowrap transition-all duration-200 \${
                        isSidebarHovered
                          ? 'opacity-100 max-w-[180px] ml-2 font-semibold'
                          : 'opacity-0 max-w-0 ml-0 overflow-hidden pointer-events-none'
                      }\`}
                    >
                      {link.title}
                    </span>
                  </Link>

                  {/* Tooltip on individual item hover when collapsed */}
                  {!isSidebarHovered && (
                    <div className="pointer-events-none absolute left-[68px] top-1/2 -translate-y-1/2 z-50 hidden rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-lg group-hover/navitem:block whitespace-nowrap">
                      {link.title}
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Logout Action */}
          <div className="mt-auto pt-3 border-t border-gray-100 shrink-0">
            <div className="relative group/logout">
              <button
                onClick={logout}
                className="w-full flex items-center rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <LogOut className="h-5 w-5 shrink-0 text-red-500" />
                </div>
                <span
                  className={\`whitespace-nowrap transition-all duration-200 \${
                    isSidebarHovered
                      ? 'opacity-100 max-w-[180px] ml-2 font-semibold'
                      : 'opacity-0 max-w-0 ml-0 overflow-hidden pointer-events-none'
                  }\`}
                >
                  Logout
                </span>
              </button>

              {/* Tooltip on hover when collapsed */}
              {!isSidebarHovered && (
                <div className="pointer-events-none absolute left-[68px] top-1/2 -translate-y-1/2 z-50 hidden rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-lg group-hover/logout:block whitespace-nowrap">
                  Logout
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>`;

const oldStart = content.indexOf('{/* Desktop Rail Placeholder');
const oldEnd = content.indexOf('</aside>', oldStart);
if (oldStart !== -1 && oldEnd !== -1) {
  content = content.substring(0, oldStart) + newPlaceholderAndAside + content.substring(oldEnd + 8);
  console.log('✓ Replaced desktop rail and sidebar with strictly fixed 74px inline styles');
} else {
  console.error('Could not find placeholder boundaries');
  process.exit(1);
}

fs.writeFileSync(layoutPath, content, 'utf8');
console.log('Layout updated.');
