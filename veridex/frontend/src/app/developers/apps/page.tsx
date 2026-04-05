import type { Metadata } from 'next';
import Link from 'next/link';
import DeveloperAppsManager from '@/components/DeveloperAppsManager';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Veridex Developer Apps',
  description: 'Standalone developer portal for managing Veridex embedded login apps and callback configuration.',
};

export default function DeveloperAppsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        <div className={styles.hero}>
          <div className={styles.heroTopline}>
            <span className={styles.eyebrow}>Developer Portal</span>
            <Link href="/api-docs" className={styles.backLink}>
              Back to API docs
            </Link>
          </div>

          <div className={styles.heroGrid}>
            <div>
              <h1 className={styles.title}>Developer apps for embedded login.</h1>
              <p className={styles.lead}>
                This page is the operational surface behind the Veridex auth docs. Register clients, define exact
                callback surfaces, and keep your localhost and deployed environments aligned before integrating a partner app.
              </p>
            </div>

            <div className={styles.heroCard}>
              <p className={styles.cardLabel}>What happens here</p>
              <ul className={styles.cardList}>
                <li>Create a partner client and copy its secret once.</li>
                <li>Set exact redirect URIs and allowed origins.</li>
                <li>Review live app registrations before wiring the consumer app.</li>
              </ul>
            </div>
          </div>
        </div>

        <DeveloperAppsManager />
      </div>
    </div>
  );
}
