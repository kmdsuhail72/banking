"use client";
import { useState } from "react";
import { GitBranch, GitPullRequest, Package, RefreshCw } from "lucide-react";

const stages = [
  {
    title: "Commit & review",
    icon: GitPullRequest,
    status: "Configured",
    detail:
      "Pull requests run workspace checks. Merging to main starts the container build workflow.",
    reference: ".github/workflows/ci.yml",
  },
  {
    title: "Build & publish",
    icon: Package,
    status: "Configured",
    detail:
      "GitHub Actions publishes the backend image to GHCR with a commit-based tag, provenance, and an SBOM.",
    reference: ".github/workflows/ci.yml · image",
  },
  {
    title: "Update desired state",
    icon: GitBranch,
    status: "Configured",
    detail:
      "Run the promotion workflow with a published image digest to open a pull request updating the selected environment?s manifest. Review and merge the commit to update desired state in Git.",
    reference: "gitops/environments/<environment>/kustomization.yaml",
  },
  {
    title: "Reconcile cluster",
    icon: RefreshCw,
    status: "Bootstrap required",
    detail:
      "Argo CD application manifests are configured. After controller installation and bootstrap, staging automatically syncs merged changes; production requires an operator to sync. Cluster connection has not been verified.",
    reference: "gitops/argocd/ ? docs/development/gitops.md",
  },
];

export function GitOpsShowcase() {
  const [selected, setSelected] = useState(0);
  return (
    <section
      id="gitops"
      className="lg:col-span-12 rounded-3xl bg-[#0B0F17]/90 border border-[#1F2937] p-6 sm:p-7 scroll-mt-24"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-400/10 text-cyan-300">
            <GitBranch size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              GitOps · From commit to cluster
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Versioned infrastructure, reviewed changes, and a visible delivery
              path.
            </p>
          </div>
        </div>
        <span className="text-[11px] rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 px-3 py-1.5 self-start">
          Controller bootstrap required
        </span>
      </div>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        aria-label="Delivery stages"
      >
        {stages.map((item, index) => (
          <button
            key={item.title}
            type="button"
            aria-pressed={selected === index}
            aria-controls="gitops-stage-detail"
            onClick={() => setSelected(index)}
            className={`text-left rounded-xl border p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 focus-visible:outline-offset-2 ${selected === index ? "border-cyan-400/60 bg-cyan-400/5" : "border-[#1F2937] bg-[#080B10] hover:border-slate-600"}`}
          >
            <div className="flex justify-between items-center mb-4">
              <item.icon className="text-cyan-300" size={20} />
              <span className="font-mono text-[10px] text-slate-500">
                0{index + 1}
              </span>
            </div>
            <span className="block text-sm text-white font-semibold">
              {item.title}
            </span>
            <span
              className={`block mt-2 text-[11px] ${index < 3 ? "text-emerald-400" : "text-amber-300"}`}
            >
              {item.status}
            </span>
          </button>
        ))}
      </div>
      <div
        id="gitops-stage-detail"
        aria-live="polite"
        className="mt-4 rounded-xl bg-[#080B10] border border-[#1F2937] p-5"
      >
        <h4 className="text-cyan-300 text-sm font-semibold">
          {stages[selected].title}
        </h4>
        <p className="text-sm leading-relaxed text-slate-300 mt-3 max-w-3xl">
          {stages[selected].detail}
        </p>
        <p className="text-[11px] text-slate-400 mt-4 font-mono">
          {stages[selected].reference}
        </p>
      </div>
      <p className="text-[11px] text-slate-400 mt-4">
        Current delivery: GitHub Actions build + manual Kubernetes rollout.
        Select a stage to explore the path to GitOps.
      </p>
    </section>
  );
}
