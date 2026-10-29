/**
 * 页脚。
 *
 * 整站唯一的固定出处：代码在哪、遇到问题找谁、什么许可。
 * 链接全部指到 GitHub 仓库，所以仓库改名或搬家只需要改这一个文件。
 */

const REPO = "https://github.com/miko-cn/Music-101";

const LINKS = [
  { href: REPO, label: "GitHub 仓库", mark: true },
  { href: `${REPO}/issues`, label: "提 Issue" },
  { href: `${REPO}/blob/main/LICENSE`, label: "MIT License" },
];

/** GitHub 官方小图标，内联一条路径，免得为一个图标装一整个图标库。 */
function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <p className="site-footer-name">Music-101</p>
          <p className="site-footer-tagline">kawaii bass / future bass 编曲速成课：先听懂，再动手做。</p>
          <p className="site-footer-note">
            全部声音由浏览器实时合成，不加载任何采样文件；学习进度只存在你自己的浏览器里。
          </p>
        </div>
        <nav className="site-footer-links" aria-label="项目链接">
          {LINKS.map((link) => (
            <a
              key={link.href}
              className="site-footer-link"
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              {link.mark ? <GitHubMark /> : null}
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <p className="site-footer-legal">
        © 2026 Miko · MIT License · 纯前端，无后端、无账号 · 字体 Noto Sans SC（SIL OFL 1.1）
      </p>
    </footer>
  );
}
