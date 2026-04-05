'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { createOAuthApp, listOAuthApps, updateOAuthApp } from '@/lib/api';
import styles from './DeveloperAppsManager.module.css';
import type { OAuthApp } from '@/types';

function parseLines(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values: string[]): string {
  return values.join('\n');
}

type AppDraft = {
  name: string;
  redirectUris: string;
  allowedOrigins: string;
};

const emptyDraft: AppDraft = {
  name: '',
  redirectUris: '',
  allowedOrigins: '',
};

export default function DeveloperAppsManager() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [form, setForm] = useState<AppDraft>({
    name: '',
    redirectUris: 'http://localhost:4000/auth/callback',
    allowedOrigins: 'http://localhost:4000',
  });
  const [drafts, setDrafts] = useState<Record<string, AppDraft>>({});

  const refreshApps = async (accessToken: string) => {
    const response = await listOAuthApps(accessToken);
    setApps(response.apps);
    setDrafts(
      Object.fromEntries(
        response.apps.map((app) => [
          app.id,
          {
            name: app.name,
            redirectUris: joinLines(app.redirect_uris),
            allowedOrigins: joinLines(app.allowed_origins),
          },
        ])
      )
    );
  };

  useEffect(() => {
    if (!token) {
      setApps([]);
      setDrafts({});
      setIsLoadingApps(false);
      return;
    }

    let cancelled = false;

    const loadApps = async () => {
      setIsLoadingApps(true);
      setError(null);

      try {
        const response = await listOAuthApps(token);
        if (cancelled) {
          return;
        }

        setApps(response.apps);
        setDrafts(
          Object.fromEntries(
            response.apps.map((app) => [
              app.id,
              {
                name: app.name,
                redirectUris: joinLines(app.redirect_uris),
                allowedOrigins: joinLines(app.allowed_origins),
              },
            ])
          )
        );
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load developer apps');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingApps(false);
        }
      }
    };

    loadApps();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleCreate = async () => {
    if (!token || !form.name.trim()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await createOAuthApp(
        {
          name: form.name.trim(),
          redirect_uris: parseLines(form.redirectUris),
          allowed_origins: parseLines(form.allowedOrigins),
          scopes: ['openid', 'profile'],
        },
        token
      );

      setCreatedSecret(response.app.client_secret || null);
      setForm((current) => ({
        ...current,
        name: '',
      }));
      await refreshApps(token);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to create developer app');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (appId: string) => {
    if (!token) {
      return;
    }

    const draft = drafts[appId];
    if (!draft) {
      return;
    }

    setBusyAppId(appId);
    setError(null);

    try {
      await updateOAuthApp(
        appId,
        {
          name: draft.name.trim(),
          redirect_uris: parseLines(draft.redirectUris),
          allowed_origins: parseLines(draft.allowedOrigins),
          scopes: ['openid', 'profile'],
        },
        token
      );
      await refreshApps(token);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update app');
    } finally {
      setBusyAppId(null);
    }
  };

  const totalRedirectUris = useMemo(
    () => apps.reduce((sum, app) => sum + app.redirect_uris.length, 0),
    [apps]
  );

  const totalOrigins = useMemo(
    () => apps.reduce((sum, app) => sum + app.allowed_origins.length, 0),
    [apps]
  );

  if (authLoading || (token && isLoadingApps)) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.gate}>
        <p className={styles.label}>Sign in required</p>
        <h3 className={styles.heading}>Manage OAuth apps from this page</h3>
        <p className={styles.copy}>
          Developer app registration now lives in the dedicated developer portal. Sign in to create a client, copy the
          one-time secret, and maintain redirect URI and origin allowlists without leaving this route.
        </p>
        <Link href="/verify" className={styles.buttonLink}>
          Sign in to manage apps
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={styles.gate}>
        <p className={styles.label}>Session unavailable</p>
        <p className={styles.copy}>
          We could not find an active session token for app management. Refresh the page or sign in again to continue.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {createdSecret ? (
        <div className={styles.notice}>
          <div className={styles.label}>Client secret</div>
          <h3 className={styles.heading}>Copy this now</h3>
          <p className={styles.copy}>
            This secret is only shown once after creation. Store it in the partner backend and never expose it in the
            browser.
          </p>
          <pre className={styles.codeBlock}>{createdSecret}</pre>
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.grid}>
        <section className={styles.rail}>
          <div className={styles.panel}>
            <div className={styles.label}>Create app</div>
            <p className={styles.copy}>
              Start with one localhost callback and one deployed callback. Keep origins exact. A trailing slash mismatch
              is enough to break the popup handoff.
            </p>
            <div className={styles.form}>
              <label className={styles.field}>
                <span className={styles.labelMuted}>App name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Acme Marketplace"
                  className={styles.input}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.labelMuted}>Redirect URIs</span>
                <textarea
                  rows={5}
                  value={form.redirectUris}
                  onChange={(event) => setForm((current) => ({ ...current, redirectUris: event.target.value }))}
                  className={styles.textarea}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.labelMuted}>Allowed origins</span>
                <textarea
                  rows={3}
                  value={form.allowedOrigins}
                  onChange={(event) => setForm((current) => ({ ...current, allowedOrigins: event.target.value }))}
                  className={styles.textarea}
                />
              </label>

              <button onClick={handleCreate} disabled={isSaving} className={styles.button}>
                {isSaving ? 'Creating...' : 'Create developer app'}
              </button>
            </div>
          </div>

          <div className={styles.checklist}>
            <div className={styles.label}>Before you test</div>
            <ul className={styles.checklistList}>
              <li>Register the exact callback URL your partner app will expect.</li>
              <li>Register the exact browser origin that will receive the popup message.</li>
              <li>Keep localhost and deployed callbacks as separate lines, not one mixed entry.</li>
              <li>Store the one-time client secret only in the partner backend.</li>
            </ul>
          </div>

          <div className={styles.snippet}>
            <div className={styles.label}>Typical localhost pair</div>
            <pre className={styles.codeBlock}>{`redirect_uri=http://localhost:5173/auth/callback
allowed_origin=http://localhost:5173`}</pre>
          </div>
        </section>

        <section className={styles.workspace}>
          <div className={styles.workspaceTop}>
            <div className={styles.workspaceIntro}>
              <div className={styles.label}>Registered apps</div>
              <h3 className={styles.workspaceTitle}>Live partner clients</h3>
            </div>
            <p className={`${styles.copy} ${styles.workspaceSummary}`}>
              Use this area to review what each app is allowed to do before you move into the partner integration.
            </p>
          </div>

          <div className={styles.stats}>
            {[
              { label: 'Apps', value: String(apps.length) },
              { label: 'Redirect URIs', value: String(totalRedirectUris) },
              { label: 'Allowed origins', value: String(totalOrigins) },
              { label: 'Owner', value: user.display_name || 'Developer', isOwner: true },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`${styles.statCard}${stat.isOwner ? ` ${styles.statCardOwner}` : ''}`}
              >
                <p className={styles.labelMuted}>{stat.label}</p>
                <p className={`${styles.statValue}${stat.isOwner ? ` ${styles.statValueOwner}` : ''}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {apps.length === 0 ? (
            <p className={styles.copy}>
              No developer apps yet. Create one to generate a <code className={styles.inlineCode}>client_id</code> and
              one-time <code className={styles.inlineCode}>client_secret</code>.
            </p>
          ) : (
            <div className={styles.appList}>
              {apps.map((app) => {
                const draft = drafts[app.id] || emptyDraft;

                return (
                  <article key={app.id} className={styles.appCard}>
                    <div className={styles.appHeader}>
                      <div className={styles.appMeta}>
                        <h3 className={styles.appTitle}>{app.name}</h3>
                        <p className={styles.label}>Client ID</p>
                        <code className={styles.clientId}>{app.client_id}</code>
                        <div className={styles.metaRow}>
                          <span>{app.redirect_uris.length} redirect {app.redirect_uris.length === 1 ? 'entry' : 'entries'}</span>
                          <span>{app.allowed_origins.length} origin {app.allowed_origins.length === 1 ? 'entry' : 'entries'}</span>
                          <span>{app.scopes.join(' ')}</span>
                        </div>
                      </div>
                      <div className={styles.appActions}>
                        <p className={styles.appActionHint}>Save after updating the name, redirect URIs, or allowed origins.</p>
                        <button
                          onClick={() => handleUpdate(app.id)}
                          disabled={busyAppId === app.id}
                          className={styles.button}
                        >
                          {busyAppId === app.id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>

                    <div className={styles.editorGrid}>
                      <label className={styles.field}>
                        <span className={styles.labelMuted}>App name</span>
                        <input
                          value={draft.name}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [app.id]: {
                                name: event.target.value,
                                redirectUris: current[app.id]?.redirectUris || '',
                                allowedOrigins: current[app.id]?.allowedOrigins || '',
                              },
                            }))
                          }
                          className={styles.input}
                        />
                      </label>

                      <label className={styles.field}>
                        <span className={styles.labelMuted}>Redirect URIs</span>
                        <textarea
                          rows={4}
                          value={draft.redirectUris}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [app.id]: {
                                name: current[app.id]?.name || '',
                                redirectUris: event.target.value,
                                allowedOrigins: current[app.id]?.allowedOrigins || '',
                              },
                            }))
                          }
                          className={styles.textarea}
                        />
                      </label>

                      <label className={styles.field}>
                        <span className={styles.labelMuted}>Allowed origins</span>
                        <textarea
                          rows={2}
                          value={draft.allowedOrigins}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [app.id]: {
                                name: current[app.id]?.name || '',
                                redirectUris: current[app.id]?.redirectUris || '',
                                allowedOrigins: event.target.value,
                              },
                            }))
                          }
                          className={styles.textarea}
                        />
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
