import React, { useState, useEffect } from "react";
import axios from "axios";

const PersonCard = ({ name, spouses, color }) => (
  <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden min-w-[160px] max-w-[200px]">
    <div className={`${color} px-3 py-2 text-white text-sm font-semibold text-center`}>
      {name || "Unnamed"}
    </div>
    {spouses?.length > 0 && (
      <div className="flex flex-wrap justify-center gap-1 px-2 py-2 bg-slate-50">
        {spouses.map((s, i) => (
          <span
            key={i}
            className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200"
          >
            {s || "Partner"}
          </span>
        ))}
      </div>
    )}
  </div>
);

const Node = ({ node, color, depth, maxDepth }) => {
  const [expanded, setExpanded] = useState(false);

  const hasChildren = node.children && node.children.length > 0;

  return (
    <li className="relative flex flex-col items-center">
      <PersonCard name={node.name} spouses={node.spouses} color={color} />

      {hasChildren && (
        <div className="flex flex-col items-center mt-6">
          <div className="w-px h-4 bg-gray-300"></div>

          {depth < maxDepth ? (
            // ✅ Always show children within the max depth
            <ul className="flex flex-wrap justify-center gap-6 relative">
              {node.children.map((child, idx) => (
                <Node
                  key={child.id || idx}
                  node={child}
                  color={color}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              ))}
            </ul>
          ) : (
            // ✅ Show expandable badge if deeper than maxDepth
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 text-sm shadow hover:bg-gray-300"
            >
              {expanded ? "-" : `+${node.children.length}`}
            </button>
          )}

          {/* ✅ Expanded children show as real cards */}
          {expanded && depth >= maxDepth && (
            <ul className="flex flex-wrap justify-center gap-6 mt-4 relative">
              {node.children.map((child, idx) => (
                <Node
                  key={child.id || idx}
                  node={child}
                  color={color}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

export default function FamilyTree() {
  const [tree, setTree] = useState(null);

  useEffect(() => {
    axios
      .get("https://familytree-365c.onrender.com/family-tree")
      .then((res) => setTree(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!tree) return <p className="text-center text-gray-500">Loading tree…</p>;

  const colors = [
    "bg-gradient-to-r from-rose-500 to-pink-500",
    "bg-gradient-to-r from-emerald-500 to-green-600",
    "bg-gradient-to-r from-blue-500 to-indigo-600",
    "bg-gradient-to-r from-amber-500 to-orange-600",
    "bg-gradient-to-r from-purple-500 to-fuchsia-600",
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col items-center">
        {/* Root Parents */}
        <PersonCard
          name={tree.father}
          spouses={[tree.mother]}
          color="bg-gradient-to-r from-slate-700 to-slate-900"
        />

        {tree.children?.length > 0 && (
          <ul className="flex justify-center gap-8 mt-10 flex-wrap">
            {tree.children.map((child, idx) => (
              <Node
                key={child.id || idx}
                node={child}
                color={colors[idx % colors.length]}
                depth={1}
                maxDepth={3} // 👈 Only show 3 levels, expand after
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
