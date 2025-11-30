import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
    const {siteConfig} = useDocusaurusContext();
    return (
        <header className={clsx('hero hero--primary', styles.heroBanner)}>
            <div className="container">
                <Heading as="h1" className="hero__title">
                    {siteConfig.title}
                </Heading>
                <p className="hero__subtitle">{siteConfig.tagline}</p>
                <div className={styles.buttons}>
                    <Link
                        className="button button--secondary button--lg"
                        // 直接链接到 GitHub Release
                        to="https://github.com/Microindole/elevim/releases/latest">
                        下载 v0.4.0
                    </Link>
                </div>
            </div>
        </header>
    );
}

export default function Home(): JSX.Element {
    const {siteConfig} = useDocusaurusContext();
    return (
        <Layout
            title={`Hello from ${siteConfig.title}`}
            description="Elevim - A Zen Mode Code Editor">
            <HomepageHeader />
            <main>
                {/* 这里可以放 Feature 组件 */}
                <div className="container padding-vert--xl">
                    <div className="row">
                        <div className="col col--4">
                            <div className="text--center">
                                <h3>🧘 禅模式 (Zen Mode)</h3>
                                <p>一键隐藏所有侧边栏和状态栏，配合打字机滚动与聚焦模式，让你进入心流状态。</p>
                            </div>
                        </div>
                        {/* 更多特性... */}
                    </div>
                </div>
            </main>
        </Layout>
    );
}