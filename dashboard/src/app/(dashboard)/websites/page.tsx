"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  Plus,
  Globe,
  Trash2,
  Copy,
  Check,
  Key,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import {
  createWebsite,
  deleteWebsite,
  getWebsite,
  createApiKey,
  revokeApiKey,
  getApiKeys,
  type WebsiteWithScript,
  type ApiKey,
} from "@/lib/auth";

export default function WebsitesPage() {
  const { websites, refreshWebsites, setCurrentWebsite, currentWebsite } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteDomain, setNewSiteDomain] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [siteDetails, setSiteDetails] = useState<Record<string, WebsiteWithScript>>({});
  const [siteApiKeys, setSiteApiKeys] = useState<Record<string, ApiKey[]>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCreateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsCreating(true);

    try {
      const site = await createWebsite(newSiteName, newSiteDomain);
      await refreshWebsites();
      setShowAddForm(false);
      setNewSiteName("");
      setNewSiteDomain("");
      setExpandedSite(site.site_id);
      setNewApiKey(site.api_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create website");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteWebsite = async (siteId: string) => {
    if (!confirm("Are you sure you want to delete this website? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteWebsite(siteId);
      await refreshWebsites();
      if (expandedSite === siteId) {
        setExpandedSite(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete website");
    }
  };

  const handleExpandSite = async (siteId: string) => {
    if (expandedSite === siteId) {
      setExpandedSite(null);
      return;
    }

    setExpandedSite(siteId);

    if (!siteDetails[siteId]) {
      try {
        const [details, keys] = await Promise.all([
          getWebsite(siteId),
          getApiKeys(siteId),
        ]);
        setSiteDetails((prev) => ({ ...prev, [siteId]: details }));
        setSiteApiKeys((prev) => ({ ...prev, [siteId]: keys }));
      } catch (err) {
        console.error("Failed to load site details:", err);
      }
    }
  };

  const handleCreateApiKey = async (siteId: string) => {
    try {
      const { api_key } = await createApiKey(siteId);
      setNewApiKey(api_key);
      const keys = await getApiKeys(siteId);
      setSiteApiKeys((prev) => ({ ...prev, [siteId]: keys }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    }
  };

  const handleRevokeApiKey = async (siteId: string, keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) {
      return;
    }

    try {
      await revokeApiKey(siteId, keyId);
      const keys = await getApiKeys(siteId);
      setSiteApiKeys((prev) => ({ ...prev, [siteId]: keys }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
            Websites
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            Manage your tracked websites and API keys
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 transition-colors text-white w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Website</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* New API Key Alert */}
      {newApiKey && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-green-400 font-medium mb-2">
                API Key Created Successfully
              </p>
              <p className="text-gray-400 text-sm mb-3">
                Copy this key now. You won't be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="px-3 py-2 rounded-lg bg-[var(--background)] text-white font-mono text-sm break-all">
                  {newApiKey}
                </code>
                <button
                  onClick={() => handleCopy(newApiKey, "new-api-key")}
                  className="p-2 rounded-lg bg-[var(--background)] hover:bg-[var(--border)] transition-colors"
                >
                  {copiedField === "new-api-key" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewApiKey(null)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Add Website Form */}
      {showAddForm && (
        <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
          <h2 className="text-lg font-semibold text-white mb-4">Add New Website</h2>
          <form onSubmit={handleCreateWebsite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Website Name
              </label>
              <input
                type="text"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="My Website"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Domain
              </label>
              <input
                type="text"
                value={newSiteDomain}
                onChange={(e) => setNewSiteDomain(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="example.com"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isCreating}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-medium transition-colors"
              >
                {isCreating ? "Creating..." : "Create Website"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)] text-white font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Websites List */}
      <div className="space-y-4">
        {websites.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-center">
            <Globe className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No websites added yet</p>
          </div>
        ) : (
          websites.map((site) => (
            <div
              key={site.site_id}
              className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden"
            >
              {/* Site Header */}
              <div
                className="p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-[var(--background)]/50 transition-colors"
                onClick={() => handleExpandSite(site.site_id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{site.name}</h3>
                    <p className="text-gray-400 text-sm">{site.domain}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentWebsite?.site_id === site.site_id && (
                    <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                      Active
                    </span>
                  )}
                  {expandedSite === site.site_id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedSite === site.site_id && (
                <div className="border-t border-[var(--border)] p-4 sm:p-6 space-y-6">
                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setCurrentWebsite(site)}
                      className={`px-4 py-2 rounded-xl transition-colors ${
                        currentWebsite?.site_id === site.site_id
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)] text-white"
                      }`}
                    >
                      {currentWebsite?.site_id === site.site_id
                        ? "Currently Active"
                        : "Set as Active"}
                    </button>
                    <button
                      onClick={() => handleDeleteWebsite(site.site_id)}
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>

                  {/* Script Tag */}
                  {siteDetails[site.site_id]?.script_tag && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Tracking Script
                      </h4>
                      <p className="text-gray-500 text-sm mb-3">
                        Add this script to your website's &lt;head&gt; tag to start tracking.
                      </p>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 px-4 py-3 rounded-xl bg-[var(--background)] text-gray-300 font-mono text-sm overflow-x-auto">
                          {siteDetails[site.site_id].script_tag}
                        </code>
                        <button
                          onClick={() =>
                            handleCopy(
                              siteDetails[site.site_id].script_tag,
                              `script-${site.site_id}`
                            )
                          }
                          className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                        >
                          {copiedField === `script-${site.site_id}` ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* API Keys */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        API Keys
                      </h4>
                      <button
                        onClick={() => handleCreateApiKey(site.site_id)}
                        className="px-3 py-1 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors text-sm text-white flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        New Key
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(siteApiKeys[site.site_id] || []).length === 0 ? (
                        <p className="text-gray-500 text-sm">No API keys</p>
                      ) : (
                        (siteApiKeys[site.site_id] || []).map((key) => (
                          <div
                            key={key.key_id}
                            className="flex items-center justify-between p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]"
                          >
                            <div>
                              <p className="text-white text-sm font-medium">
                                {key.name}
                              </p>
                              <p className="text-gray-500 text-xs font-mono">
                                {key.key_prefix}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleRevokeApiKey(site.site_id, key.key_id)
                              }
                              className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Site ID */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Site ID
                    </h4>
                    <div className="flex items-center gap-2">
                      <code className="px-4 py-2 rounded-xl bg-[var(--background)] text-gray-400 font-mono text-sm">
                        {site.site_id}
                      </code>
                      <button
                        onClick={() => handleCopy(site.site_id, `id-${site.site_id}`)}
                        className="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                      >
                        {copiedField === `id-${site.site_id}` ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
