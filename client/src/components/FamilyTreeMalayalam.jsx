import React, { useReducer, useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import DownloadFamilyTreeExcel from "./DownloadFamilyTreeExcel";
import "./FamilyTree.css";

const makeId = () => `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const updateNode = (nodes, id, updater) =>
  (nodes || []).map((n) =>
    n.id === id
      ? updater(n)
      : { ...n, children: updateNode(n.children || [], id, updater) }
  );

function treeReducer(state, action) {
  switch (action.type) {
    case "SET_TREE": return action.payload;
    case "UPDATE_ROOT": return { ...state, [action.field]: action.value };
    case "UPDATE_NAME":
      return {
        ...state,
        children: updateNode(state.children, action.id, (n) => ({ ...n, name: action.name })),
      };
    case "ADD_CHILD":
      return {
        ...state,
        children: updateNode(state.children, action.id, (n) => ({
          ...n,
          children: [...(n.children || []), { id: makeId(), name: "", spouses: [], children: [], collapsed: false }],
        })),
      };
    case "ADD_ROOT_CHILD":
      return {
        ...state,
        children: [...(state.children || []), { id: makeId(), name: "", spouses: [], children: [], collapsed: false }]
      };
    case "DELETE_NODE":
      const deleteNode = (nodes, id) =>
        (nodes || []).filter((n) => n.id !== id).map((n) => ({ ...n, children: deleteNode(n.children, id) }));
      return { ...state, children: deleteNode(state.children, action.id) };
    case "TOGGLE_COLLAPSE":
      return {
        ...state,
        children: updateNode(state.children, action.id, (n) => ({ ...n, collapsed: !n.collapsed })),
      };
    case "ADD_SPOUSE":
      return {
        ...state,
        children: updateNode(state.children, action.id, (n) => ({ ...n, spouses: [...(n.spouses || []), ""] })),
      };
    case "UPDATE_SPOUSE":
      return {
        ...state,
        children: updateNode(state.children, action.id, (n) => {
          const copy = [...(n.spouses || [])];
          copy[action.idx] = action.name;
          return { ...n, spouses: copy };
        }),
      };
    case "DELETE_SPOUSE":
      return {
        ...state,
        children: updateNode(state.children, action.id, (n) => {
          const copy = [...(n.spouses || [])];
          copy.splice(action.idx, 1);
          return { ...n, spouses: copy };
        }),
      };
    case "SET_COLLAPSED_ALL":
      const setCollapsedRecursive = (nodes, collapsed) =>
        (nodes || []).map((n) => ({
          ...n,
          collapsed,
          children: setCollapsedRecursive(n.children, collapsed),
        }));
      return {
        ...state,
        children: setCollapsedRecursive(state.children, action.collapsed),
      };
    default: return state;
  }
}

const doesNodeMatch = (node, term) => {
  if (!term) return false;
  const match = (str) => str.toLowerCase().includes(term.toLowerCase());
  if (match(node.name || "")) return true;
  if (node.spouses?.some(s => match(s || ""))) return true;
  return node.children?.some(c => doesNodeMatch(c, term));
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const MemberNode = ({ node, dispatch, searchTerm }) => {
  const [localName, setLocalName] = useState(node.name);
  const nodeRef = useRef(null);
  useEffect(() => setLocalName(node.name), [node.name]);

  const hasChildren = node.children && node.children.length > 0;
  
  const match = (str) => {
    if (!searchTerm) return false;
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t);
    const content = str.toLowerCase();
    return terms.every(term => content.includes(term));
  };

  const isMatch = match(node.name || "") || node.spouses?.some(s => match(s || ""));
  
  const hasMatchingDescendant = useMemo(() => 
    node.children?.some(c => doesNodeMatch(c, searchTerm)),
    [node.children, searchTerm]
  );

  const shouldExpand = (hasChildren && !node.collapsed) || (searchTerm && hasMatchingDescendant);

  useEffect(() => {
    if (isMatch && searchTerm && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [isMatch, searchTerm]);

  return (
    <div className="member-node">
      <div ref={nodeRef} className={`member-header ${isMatch ? "search-highlight" : ""}`}>
        <button 
          className="btn-icon" 
          style={{ width: '1.5rem', height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }} 
          onClick={() => dispatch({ type: "TOGGLE_COLLAPSE", id: node.id })}
        >
          {hasChildren ? (node.collapsed ? "▶" : "▼") : "○"}
        </button>
        <div className="member-info">
          <input
            className="member-name-input"
            value={localName}
            placeholder="Name..."
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={() => dispatch({ type: "UPDATE_NAME", id: node.id, name: localName })}
          />
          {node.spouses && node.spouses.length > 0 && (
            <div className="spouse-section">
              {node.spouses.map((s, i) => (
                <div key={i} className="spouse-row">
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>💍</span>
                  <input
                    className="spouse-input"
                    value={s}
                    placeholder="Spouse Name..."
                    onChange={(e) => dispatch({ type: "UPDATE_SPOUSE", id: node.id, idx: i, name: e.target.value })}
                  />
                  <button className="btn-icon" style={{width: '1.2rem', height: '1.2rem'}} onClick={() => dispatch({ type: "DELETE_SPOUSE", id: node.id, idx: i })}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="member-actions">
          <button className="btn-icon" onClick={() => dispatch({ type: "ADD_CHILD", id: node.id })} title="Add Child">👶</button>
          <button className="btn-icon" onClick={() => dispatch({ type: "ADD_SPOUSE", id: node.id })} title="Add Spouse">💍</button>
          <button className="btn-icon" onClick={() => dispatch({ type: "DELETE_NODE", id: node.id })} title="Delete">🗑️</button>
        </div>
      </div>

      {shouldExpand && (
        <div className="children-group">
          {node.children.map((child) => (
            <MemberNode key={child.id} node={child} dispatch={dispatch} searchTerm={searchTerm} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function FamilyTreeMalayalam() {
  const [tree, dispatch] = useReducer(treeReducer, { father: "", mother: "", children: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleAll = () => {
    const nextState = !allExpanded;
    dispatch({ type: "SET_COLLAPSED_ALL", collapsed: !nextState });
    setAllExpanded(nextState);
  };

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/family-tree`)
      .then((res) => {
        const data = res.data || {};
        const normalizeTree = (nodes) => (nodes || []).map((n) => ({
          id: n.id || makeId(),
          name: n.name || "",
          spouses: n.spouses || [],
          children: normalizeTree(n.children || []),
          collapsed: n.collapsed !== undefined ? n.collapsed : true,
        }));
        dispatch({
          type: "SET_TREE",
          payload: { father: data.father || "", mother: data.mother || "", children: normalizeTree(data.children || []) },
        });
      })
      .catch((err) => console.error("Fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalMembers = useMemo(() => {
    let count = 0;
    if (tree.father) count++;
    if (tree.mother) count++;
    const countNodes = (nodes) => {
      nodes.forEach(n => {
        count++;
        count += (n.spouses?.length || 0);
        if (n.children) countNodes(n.children);
      });
    };
    countNodes(tree.children);
    return count;
  }, [tree]);

  const handleSave = async () => {
    const password = prompt("Password:");
    if (password === "ah2211") {
      try {
        setLoading(true);
        await axios.post(`${API_URL}/update-family-tree`, tree);
        alert("Saved.");
      } catch (err) { alert("Error."); } finally { setLoading(false); }
    } else { alert("Wrong password."); }
  };

  const match = (str) => {
    if (!searchTerm) return false;
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t);
    const content = str.toLowerCase();
    return terms.every(term => content.includes(term));
  };

  const fatherMatch = match(tree.father || "");
  const motherMatch = match(tree.mother || "");
  const rootRef = useRef(null);

  useEffect(() => {
    if ((fatherMatch || motherMatch) && searchTerm && rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [fatherMatch, motherMatch, searchTerm]);

  if (loading) return (
    <div className="app-wrapper" style={{justifyContent: 'center', alignItems: 'center'}}>
      <div className="pulse">Loading Family Tree System...</div>
      <style>{`.pulse { animation: pulse 1.5s infinite; } @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }`}</style>
    </div>
  );

  return (
    <div className="app-wrapper">
      <nav className="top-bar">
        <div className="app-title">
          <h1>Andruhaji Family <span style={{ fontSize: '0.9rem', verticalAlign: 'middle', opacity: 0.8 }}>| കുടുംബ പരമ്പര</span> <span className="member-count">({totalMembers} members)</span></h1>
        </div>
        <div className="toolbar">
          <div className="search-box">
            <input 
              className="app-input search-input" 
              placeholder="Search name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="action-group">
            <button 
              className="btn btn-icon btn-action" 
              onClick={toggleAll}
            >
              {allExpanded ? "↕ Collapse All" : "↔ Expand All"}
            </button>
            <div className="btn btn-icon btn-action btn-excel">
               <DownloadFamilyTreeExcel tree={tree} />
            </div>
            <button className="btn btn-success btn-save" onClick={handleSave}>💾 Save</button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <section className="root-section" ref={rootRef}>
          <div className={`couple-card ${fatherMatch || motherMatch ? "search-highlight" : ""}`}>
            <div className="couple-grid">
              <div className="input-field">
                <label>പിതാവ് (Father)</label>
                <input
                  className={`app-input ${fatherMatch ? "search-highlight-text" : ""}`}
                  value={tree.father}
                  placeholder="Enter Name..."
                  onChange={(e) => dispatch({ type: "UPDATE_ROOT", field: "father", value: e.target.value })}
                />
              </div>
              <div className="input-field">
                <label>മാതാവ് (Mother)</label>
                <input
                  className={`app-input ${motherMatch ? "search-highlight-text" : ""}`}
                  value={tree.mother}
                  placeholder="Enter Name..."
                  onChange={(e) => dispatch({ type: "UPDATE_ROOT", field: "mother", value: e.target.value })}
                />
              </div>
            </div>
            <div className="text-center mt-4" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => dispatch({ type: "ADD_ROOT_CHILD" })}>
                👶 Add First Child
              </button>
            </div>
          </div>
        </section>

        <section className="tree-container">
          {tree.children.map((child) => (
            <MemberNode key={child.id} node={child} dispatch={dispatch} searchTerm={searchTerm} />
          ))}
        </section>
      </main>

      <style>{`
        .search-highlight {
          border-color: var(--brand-primary) !important;
          background: rgba(129, 140, 248, 0.25) !important;
          box-shadow: 0 0 20px rgba(129, 140, 248, 0.5);
          animation: highlight-pulse 2s infinite;
        }
        .search-highlight-text {
          color: var(--brand-primary) !important;
          font-weight: 700 !important;
        }
        @keyframes highlight-pulse {
          0% { box-shadow: 0 0 0 0 rgba(129, 140, 248, 0.5); }
          70% { box-shadow: 0 0 0 15px rgba(129, 140, 248, 0); }
          100% { box-shadow: 0 0 0 0 rgba(129, 140, 248, 0); }
        }
      `}</style>
    </div>
  );
}
