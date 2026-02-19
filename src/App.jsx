import { useState, useEffect, useRef } from "react";

var STYLES = ["APA 7th", "MLA 9th", "Chicago 18th", "IEEE", "Harvard"];
var STORAGE_KEY = "cite-free-v1";
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// ═══════════════════════════════════════════════
// CITATION FORMATTING (same proven engine)
// ═══════════════════════════════════════════════

function clean(s) {
  return s.replace(/, \./g, ".").replace(/\.\./g, ".").replace(/\. \./g, ".").replace(/  +/g, " ").trim();
}

function authorIsSite(m) {
  return m.authors && m.authors.length === 1 && m.authors[0].toLowerCase().trim() === (m.siteName || "").toLowerCase().trim();
}

function splitName(n) {
  var p = n.trim().split(/\s+/);
  if (p.length === 1) return { first: "", last: p[0] };
  return { first: p.slice(0, -1).join(" "), last: p[p.length - 1] };
}

function ini(first) {
  return first.split(/\s+/).map(function(n) { return (n[0] || "").toUpperCase() + "."; }).join(" ");
}

function fmtAPAAuthors(a) {
  if (!a || !a.length) return "";
  var f = a.map(function(x) { var s = splitName(x); return s.first ? s.last + ", " + ini(s.first) : s.last; });
  if (f.length === 1) return f[0];
  if (f.length === 2) return f[0] + ", & " + f[1];
  if (f.length <= 20) return f.slice(0, -1).join(", ") + ", & " + f[f.length - 1];
  return f.slice(0, 19).join(", ") + ", ... " + f[f.length - 1];
}
function fmtMLAAuthors(a) {
  if (!a || !a.length) return "";
  var s = splitName(a[0]);
  var p = s.first ? s.last + ", " + s.first + "." : s.last + ".";
  if (a.length === 1) return p;
  if (a.length === 2) return p.replace(/\.$/, "") + ", and " + a[1] + ".";
  return p.replace(/\.$/, "") + ", et al.";
}
function fmtChicagoAuthors(a) {
  if (!a || !a.length) return "";
  var s = splitName(a[0]);
  var p = s.first ? s.last + ", " + s.first : s.last;
  if (a.length === 1) return p + ".";
  if (a.length === 2) return p + ", and " + a[1] + ".";
  if (a.length <= 10) return p + ", " + a.slice(1, -1).join(", ") + ", and " + a[a.length - 1] + ".";
  return p + ", et al.";
}
function fmtIEEEAuthors(a) {
  if (!a || !a.length) return "Unknown Author";
  var f = a.map(function(x) { var s = splitName(x); return s.first ? ini(s.first) + " " + s.last : s.last; });
  if (f.length === 1) return f[0];
  if (f.length === 2) return f[0] + " and " + f[1];
  return f.slice(0, -1).join(", ") + ", and " + f[f.length - 1];
}
function fmtHarvardAuthors(a) {
  if (!a || !a.length) return "Unknown Author";
  var f = a.map(function(x) {
    var s = splitName(x);
    if (!s.first) return s.last;
    var inits = s.first.split(/\s+/).map(function(n) { return (n[0] || "").toUpperCase() + "."; }).join("");
    return s.last + ", " + inits;
  });
  if (f.length === 1) return f[0];
  if (f.length === 2) return f[0] + " and " + f[1];
  return f.slice(0, -1).join(", ") + " and " + f[f.length - 1];
}

function fmtAPADate(d, m) {
  if (!d) return "(n.d.).";
  try {
    var dt = new Date(d);
    if (isNaN(dt.getTime())) return "(n.d.).";
    var y = dt.getUTCFullYear();
    var dStr = String(d).trim();
    var onlyYearAvailable = dStr.length === 4 && /^\d{4}$/.test(dStr);
    var isJournalArticle = m && m.sourceType === "journal" && m.journalName && m.volume;
    var isWebpage = m && (m.sourceType === "website" || m.sourceType === "news");

    if (onlyYearAvailable) return "(" + y + ").";
    if (isJournalArticle) return "(" + y + ").";
    var mo = dt.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    var day = dt.getUTCDate();
    if (isWebpage) {
      var hasFullDate = dStr.length >= 10;
      if (hasFullDate) return "(" + y + ", " + mo + " " + day + ").";
      if (dStr.length <= 7) return "(" + y + ", " + mo + ").";
      return "(" + y + ").";
    }
    if (dStr.length <= 4) return "(" + y + ").";
    if (dStr.length <= 7) return "(" + y + ", " + mo + ").";
    return "(" + y + ", " + mo + " " + day + ").";
  } catch (e) { return "(n.d.)."; }
}
function fmtMLADate(d) {
  if (!d) return "";
  try {
    var dt = new Date(d); if (isNaN(dt.getTime())) return "";
    if (d.length === 4) return "" + dt.getUTCFullYear();
    var mo = dt.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).replace(".", "");
    return dt.getUTCDate() + " " + mo + ". " + dt.getUTCFullYear();
  } catch (e) { return ""; }
}
function fmtDateDMY() {
  return new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function fmtAPA(m) {
  var authors = fmtAPAAuthors(m.authors); var date = fmtAPADate(m.publishDate, m); var title = m.title || "Untitled";
  if (m.sourceType === "journal") {
    var r = authors + " " + date + " " + title + ". ";
    if (m.journalName) r += "*" + m.journalName + "*";
    if (m.volume) r += ", *" + m.volume + "*";
    if (m.issue) r += "(" + m.issue + ")";
    if (m.pages) r += ", " + m.pages;
    if (m.articleNumber && !m.pages) r += ", Article " + m.articleNumber;
    r += ". ";
    if (m.doi) r += "https://doi.org/" + m.doi; else if (m.url) r += m.url;
    return clean(r);
  }
  if (m.sourceType === "book") {
    var r = authors + " " + date + " *" + title + "*";
    if (m.edition) r += " (" + m.edition + ")";
    r += ". ";
    if (m.publisher) r += m.publisher + ". ";
    if (m.doi) r += "https://doi.org/" + m.doi; else if (m.url) r += m.url;
    return clean(r);
  }
  var r = authors + " " + date + " *" + title + "*. ";
  if (m.siteName && !authorIsSite(m)) r += m.siteName + ". ";
  if (m.url) r += m.url;
  return clean(r);
}
function fmtMLA(m) {
  var authors = fmtMLAAuthors(m.authors); var acc = fmtDateDMY();
  if (m.sourceType === "journal") {
    var r = authors + ' "' + m.title + '." ';
    if (m.journalName) r += "*" + m.journalName + "*, ";
    if (m.volume) r += "vol. " + m.volume + ", ";
    if (m.issue) r += "no. " + m.issue + ", ";
    if (m.publishDate) r += fmtMLADate(m.publishDate) + ", ";
    if (m.pages) r += "pp. " + m.pages + ", ";
    else if (m.articleNumber) r += "article " + m.articleNumber + ", ";
    if (m.doi) r += "https://doi.org/" + m.doi + "."; else if (m.url) r += m.url + ".";
    return clean(r);
  }
  if (m.sourceType === "book") {
    var r = authors + " *" + m.title + "*. ";
    if (m.edition) r += m.edition + ", ";
    if (m.publisher) r += m.publisher + ", ";
    if (m.publishDate) r += fmtMLADate(m.publishDate) + ".";
    return clean(r);
  }
  var r = authors + ' "' + m.title + '." ';
  if (m.siteName) r += "*" + m.siteName + "*, ";
  if (m.publisher && m.publisher !== m.siteName) r += m.publisher + ", ";
  if (m.publishDate) r += fmtMLADate(m.publishDate) + ", ";
  if (m.url) r += m.url + ". ";
  r += "Accessed " + acc + ".";
  return clean(r);
}
function fmtChicago(m) {
  var authors = fmtChicagoAuthors(m.authors);
  if (m.sourceType === "journal") {
    var r = authors + ' "' + m.title + '." *' + (m.journalName || "") + '* ';
    if (m.volume) r += m.volume;
    if (m.issue) r += ", no. " + m.issue;
    if (m.publishDate) r += " (" + new Date(m.publishDate).getFullYear() + ")";
    if (m.pages) r += ": " + m.pages; else if (m.articleNumber) r += ": " + m.articleNumber;
    r += ". ";
    if (m.doi) r += "https://doi.org/" + m.doi + "."; else if (m.url) r += m.url + ".";
    return clean(r);
  }
  if (m.sourceType === "book") {
    var r = authors + " *" + m.title + "*. ";
    if (m.edition) r += m.edition + ". ";
    if (m.publisher) r += m.publisher + ", ";
    if (m.publishDate) r += new Date(m.publishDate).getFullYear() + ".";
    return clean(r);
  }
  var r = authors + ' "' + m.title + '." ';
  if (m.siteName) r += m.siteName + ". ";
  if (m.publisher && m.publisher !== m.siteName) r += m.publisher + ". ";
  if (m.publishDate) {
    var d = new Date(m.publishDate);
    r += d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) + ". ";
  }
  if (m.url) r += m.url + ".";
  return clean(r);
}
function fmtIEEE(m) {
  var authors = fmtIEEEAuthors(m.authors);
  var acc = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (m.sourceType === "journal") {
    var r = authors + ', "' + m.title + '," ';
    if (m.journalName) r += "*" + m.journalName + "*, ";
    if (m.volume) r += "vol. " + m.volume + ", ";
    if (m.issue) r += "no. " + m.issue + ", ";
    if (m.pages) r += "pp. " + m.pages + ", ";
    else if (m.articleNumber) r += "art. no. " + m.articleNumber + ", ";
    if (m.publishDate) { var d = new Date(m.publishDate); r += d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) + " " + d.getUTCFullYear() + ". "; }
    if (m.doi) r += "doi: " + m.doi + "."; else if (m.url) r += "[Online]. Available: " + m.url;
    return clean(r);
  }
  var r = authors + ', "' + m.title + '," ';
  if (m.siteName) r += "*" + m.siteName + "*. ";
  r += "[Online]. Available: " + (m.url || "") + ". [Accessed: " + acc + "].";
  return clean(r);
}
function fmtHarvard(m) {
  var authors = fmtHarvardAuthors(m.authors);
  var year = "n.d."; try { if (m.publishDate) year = new Date(m.publishDate).getUTCFullYear(); } catch (e) {}
  var acc = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  if (m.sourceType === "journal") {
    var r = authors + " (" + year + ") '" + m.title + "', ";
    if (m.journalName) r += "*" + m.journalName + "*, ";
    if (m.volume) r += m.volume; if (m.issue) r += "(" + m.issue + ")";
    if (m.pages) r += ", pp. " + m.pages; else if (m.articleNumber) r += ", article " + m.articleNumber;
    r += ". ";
    if (m.doi) r += "doi: " + m.doi + "."; else if (m.url) r += "Available at: " + m.url + " (Accessed: " + acc + ").";
    return clean(r);
  }
  var r = authors + " (" + year + ") *" + m.title + "*. ";
  if (m.siteName && !authorIsSite(m)) r += m.siteName + ". ";
  r += "Available at: " + (m.url || "") + " (Accessed: " + acc + ").";
  return clean(r);
}

function formatCitation(meta, style) {
  if (style === "APA 7th") return fmtAPA(meta);
  if (style === "MLA 9th") return fmtMLA(meta);
  if (style === "Chicago 18th") return fmtChicago(meta);
  if (style === "IEEE") return fmtIEEE(meta);
  if (style === "Harvard") return fmtHarvard(meta);
  return fmtAPA(meta);
}

// ═══════════════════════════════════════════════
// RICH TEXT / CLIPBOARD
// ═══════════════════════════════════════════════

function RichText(props) {
  var parts = props.text.split(/(\*[^*]+\*)/g);
  return (
    <span>
      {parts.map(function(p, i) {
        if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}
function toPlain(t) { return t.replace(/\*([^*]+)\*/g, "$1"); }
async function copyFormatted(text) {
  var html = text.replace(/\*([^*]+)\*/g, "<i>$1</i>");
  try {
    await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([toPlain(text)], { type: "text/plain" }) })]);
    return true;
  } catch (e) { try { await navigator.clipboard.writeText(toPlain(text)); return true; } catch (e2) { return false; } }
}

// ═══════════════════════════════════════════════
// DOI EXTRACTION
// ═══════════════════════════════════════════════

function extractDOI(url) {
  if (!url) return null;
  var patterns = [
    /doi\.org\/(10\.\d{4,}\/[^\s?#]+)/i,
    /\/doi\/(10\.\d{4,}\/[^\s?#]+)/i,
    /\/abs\/(10\.\d{4,}\/[^\s?#]+)/i,
    /\/full\/(10\.\d{4,}\/[^\s?#]+)/i,
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = url.match(patterns[i]);
    if (m) return m[1].replace(/[.,;:)\]]+$/, "");
  }
  return null;
}

function extractDOIFromText(text) {
  var m = text.match(/\b(10\.\d{4,}\/[^\s,;)}\]]+)/);
  return m ? m[1].replace(/[.,;:)\]]+$/, "") : null;
}

// ═══════════════════════════════════════════════
// CROSSREF API (free, no key needed)
// ═══════════════════════════════════════════════

async function fetchCrossRef(doi) {
  var resp = await fetch("https://api.crossref.org/works/" + encodeURIComponent(doi), {
    headers: { "Accept": "application/json" }
  });
  if (!resp.ok) return null;
  var data = await resp.json();
  var item = data.message;
  if (!item) return null;

  // Extract authors
  var authors = [];
  if (item.author) {
    authors = item.author.map(function(a) {
      var given = a.given || "";
      var family = a.family || "";
      if (given && family) return given + " " + family;
      if (family) return family;
      return given;
    }).filter(function(a) { return a; });
  }

  // Extract title
  var title = "";
  if (item.title && item.title.length > 0) title = item.title[0];

  // Extract date - prefer published-print, then published-online, then issued
  var publishDate = "";
  var dateSources = [item["published-print"], item["published-online"], item.issued];
  for (var i = 0; i < dateSources.length; i++) {
    var ds = dateSources[i];
    if (ds && ds["date-parts"] && ds["date-parts"][0]) {
      var parts = ds["date-parts"][0];
      if (parts[0]) {
        publishDate = "" + parts[0];
        if (parts[1]) publishDate += "-" + String(parts[1]).padStart(2, "0");
        if (parts[2]) publishDate += "-" + String(parts[2]).padStart(2, "0");
      }
      break;
    }
  }

  // Extract journal
  var journalName = "";
  if (item["container-title"] && item["container-title"].length > 0) {
    journalName = item["container-title"][0];
  }

  // Volume, issue, pages
  var volume = item.volume || "";
  var issue = item.issue || "";
  var pages = item.page || "";
  var articleNumber = item["article-number"] || "";

  // Publisher
  var publisher = item.publisher || "";

  // Source type
  var sourceType = "website";
  var type = item.type || "";
  if (type === "journal-article" || type === "proceedings-article") sourceType = "journal";
  else if (type === "book" || type === "book-chapter" || type === "monograph") sourceType = "book";

  // URL
  var url = "";
  if (item.URL) url = item.URL;
  else if (doi) url = "https://doi.org/" + doi;

  return {
    authors: authors,
    title: title,
    publishDate: publishDate,
    journalName: journalName,
    volume: volume,
    issue: issue,
    pages: pages,
    articleNumber: articleNumber,
    doi: doi,
    siteName: "",
    publisher: publisher,
    sourceType: sourceType,
    edition: "",
    description: "",
    url: url,
  };
}

// ═══════════════════════════════════════════════
// HTML META TAG PARSER
// ═══════════════════════════════════════════════

function parseMetaTags(html, pageUrl) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, "text/html");

  function getMeta(names) {
    for (var i = 0; i < names.length; i++) {
      var el = doc.querySelector('meta[name="' + names[i] + '"]') ||
               doc.querySelector('meta[property="' + names[i] + '"]');
      if (el && el.getAttribute("content")) return el.getAttribute("content").trim();
    }
    return "";
  }

  function getAllMeta(names) {
    var results = [];
    for (var i = 0; i < names.length; i++) {
      var els = doc.querySelectorAll('meta[name="' + names[i] + '"], meta[property="' + names[i] + '"]');
      els.forEach(function(el) {
        var c = el.getAttribute("content");
        if (c && c.trim()) results.push(c.trim());
      });
    }
    return results;
  }

  // Authors
  var authors = getAllMeta(["citation_author", "dc.creator", "DC.creator", "author", "article:author"]);
  // Some sites put all authors in one tag separated by commas or semicolons
  if (authors.length === 1 && (authors[0].includes(",") || authors[0].includes(";"))) {
    // But be careful - "Last, First" is one author
    if (authors[0].includes(";")) {
      authors = authors[0].split(";").map(function(a) { return a.trim(); }).filter(Boolean);
    }
  }
  // Deduplicate
  var seen = {};
  authors = authors.filter(function(a) { if (seen[a.toLowerCase()]) return false; seen[a.toLowerCase()] = true; return true; });

  // Title
  var title = getMeta(["citation_title", "dc.title", "DC.title", "og:title", "twitter:title"]);
  if (!title) {
    var h1 = doc.querySelector("h1");
    if (h1) title = h1.textContent.trim();
  }
  if (!title) {
    var titleEl = doc.querySelector("title");
    if (titleEl) title = titleEl.textContent.trim().split("|")[0].split("-")[0].trim();
  }

  // Date
  var publishDate = getMeta(["citation_publication_date", "citation_date", "citation_online_date",
    "dc.date", "DC.date", "article:published_time", "datePublished", "date"]);
  // Normalize date
  if (publishDate) {
    // Handle formats like "2011/7/7" or "July 7, 2011" or "2011-07-07"
    publishDate = publishDate.replace(/\//g, "-");
    try {
      var d = new Date(publishDate);
      if (!isNaN(d.getTime())) {
        publishDate = d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
      }
    } catch (e) {}
  }

  // Journal
  var journalName = getMeta(["citation_journal_title", "citation_journal_abbrev", "prism.publicationName"]);

  // Volume, issue, pages
  var volume = getMeta(["citation_volume", "prism.volume"]);
  var issue = getMeta(["citation_issue", "prism.number"]);
  var firstPage = getMeta(["citation_firstpage"]);
  var lastPage = getMeta(["citation_lastpage"]);
  var pages = firstPage && lastPage ? firstPage + "-" + lastPage : firstPage || "";

  // DOI
  var doi = getMeta(["citation_doi", "dc.identifier", "DC.identifier", "prism.doi"]);
  if (doi) doi = doi.replace(/^https?:\/\/doi\.org\//i, "");
  if (!doi) doi = extractDOI(pageUrl) || "";

  // Site name
  var siteName = getMeta(["og:site_name", "application-name"]);

  // Publisher
  var publisher = getMeta(["citation_publisher", "dc.publisher", "DC.publisher"]);

  // Article number
  var articleNumber = getMeta(["citation_article_number"]);

  // Source type
  var sourceType = "website";
  if (journalName || getMeta(["citation_journal_title"])) sourceType = "journal";
  else if (getMeta(["og:type"]) === "article") sourceType = "news";

  return {
    authors: authors,
    title: title,
    publishDate: publishDate,
    journalName: journalName,
    volume: volume,
    issue: issue,
    pages: pages,
    articleNumber: articleNumber,
    doi: doi,
    siteName: siteName,
    publisher: publisher,
    sourceType: sourceType,
    edition: "",
    description: getMeta(["description", "og:description"]),
    url: getMeta(["og:url", "citation_public_url"]) || pageUrl,
  };
}

// ═══════════════════════════════════════════════
// CORS PROXY (fetch any URL's HTML)
// ═══════════════════════════════════════════════

var CORS_PROXIES = [
  function(url) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url); },
  function(url) { return "https://corsproxy.io/?" + encodeURIComponent(url); },
];

async function fetchHTML(url) {
  for (var i = 0; i < CORS_PROXIES.length; i++) {
    try {
      var proxyUrl = CORS_PROXIES[i](url);
      var resp = await fetch(proxyUrl);
      if (resp.ok) {
        var text = await resp.text();
        if (text && text.length > 200) return text;
      }
    } catch (e) {
      continue;
    }
  }
  throw new Error("Could not fetch the page. The site may be blocking access.");
}

// ═══════════════════════════════════════════════
// PDF TEXT EXTRACTION (using pdf.js CDN)
// ═══════════════════════════════════════════════

var pdfjsLoaded = false;
async function loadPdfJs() {
  if (pdfjsLoaded) return;
  return new Promise(function(resolve, reject) {
    var script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = function() {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      pdfjsLoaded = true;
      resolve();
    };
    script.onerror = function() { reject(new Error("Failed to load PDF.js")); };
    document.head.appendChild(script);
  });
}

async function extractPdfText(file) {
  await loadPdfJs();
  var arrayBuffer = await file.arrayBuffer();
  var pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  var fullText = "";
  // Only need first few pages for metadata
  var maxPages = Math.min(pdf.numPages, 3);
  for (var i = 1; i <= maxPages; i++) {
    var page = await pdf.getPage(i);
    var content = await page.getTextContent();
    var pageText = content.items.map(function(item) { return item.str; }).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

function parsePdfText(text) {
  // Try to extract DOI from the text
  var doi = extractDOIFromText(text);

  // Try to extract title (usually the largest/first prominent text, first line-ish)
  var lines = text.split("\n").map(function(l) { return l.trim(); }).filter(Boolean);
  var title = lines[0] || "";
  // Clean up title - remove things that look like journal headers
  if (title.length < 10 && lines.length > 1) title = lines[1] || "";

  return { doi: doi, rawText: text, guessedTitle: title };
}

// ═══════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════

export default function CitationGenerator() {
  var [folders, setFolders] = useState([{ id: "default", name: "General", citations: [] }]);
  var [activeFolder, setActiveFolder] = useState("default");
  var [url, setUrl] = useState("");
  var [style, setStyle] = useState("APA 7th");
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");
  var [copiedId, setCopiedId] = useState(null);
  var [newFolderName, setNewFolderName] = useState("");
  var [showNewFolder, setShowNewFolder] = useState(false);
  var [editingId, setEditingId] = useState(null);
  var [editText, setEditText] = useState("");
  var [sidebarOpen, setSidebarOpen] = useState(true);
  var [toast, setToast] = useState("");
  var [metaPreview, setMetaPreview] = useState(null);
  var inputRef = useRef(null);
  var pdfInputRef = useRef(null);
  var [pdfFile, setPdfFile] = useState(null);
  var [pdfName, setPdfName] = useState("");

  // Load
  useEffect(function() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.folders && d.folders.length > 0) {
          setFolders(d.folders);
          if (d.activeFolder) setActiveFolder(d.activeFolder);
        }
      }
    } catch (e) {}
  }, []);

  // Save
  var saveTimer = useRef(null);
  useEffect(function() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(function() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ folders: folders, activeFolder: activeFolder })); } catch (e) {}
    }, 500);
  }, [folders, activeFolder]);

  var currentFolder = folders.find(function(f) { return f.id === activeFolder; }) || folders[0];

  function showToast(msg) { setToast(msg); setTimeout(function() { setToast(""); }, 2500); }

  // ── GENERATE FROM URL ──
  async function handleGenerate() {
    var inputUrl = url.trim();
    if (!inputUrl) return;
    setLoading(true); setError(""); setMetaPreview(null);

    try {
      var meta = null;

      // Strategy 1: If URL has a DOI, go straight to CrossRef
      var doi = extractDOI(inputUrl);
      if (doi) {
        meta = await fetchCrossRef(doi);
      }

      // Strategy 2: Fetch the page HTML and parse meta tags
      if (!meta || !meta.title) {
        try {
          var html = await fetchHTML(inputUrl);
          var pageMeta = parseMetaTags(html, inputUrl);

          if (meta) {
            // Merge: CrossRef data takes priority, but fill gaps from HTML
            if (!meta.title && pageMeta.title) meta.title = pageMeta.title;
            if (!meta.siteName && pageMeta.siteName) meta.siteName = pageMeta.siteName;
            if (!meta.publishDate && pageMeta.publishDate) meta.publishDate = pageMeta.publishDate;
            if (meta.authors.length === 0 && pageMeta.authors.length > 0) meta.authors = pageMeta.authors;
          } else {
            meta = pageMeta;
          }

          // If we found a DOI in the HTML that we didn't have before, try CrossRef
          if (meta.doi && !doi) {
            var crossRefMeta = await fetchCrossRef(meta.doi);
            if (crossRefMeta && crossRefMeta.title) {
              // CrossRef has better data — merge it in
              if (crossRefMeta.publishDate) meta.publishDate = crossRefMeta.publishDate;
              if (crossRefMeta.authors.length > 0) meta.authors = crossRefMeta.authors;
              if (crossRefMeta.volume) meta.volume = crossRefMeta.volume;
              if (crossRefMeta.issue) meta.issue = crossRefMeta.issue;
              if (crossRefMeta.pages) meta.pages = crossRefMeta.pages;
              if (crossRefMeta.articleNumber) meta.articleNumber = crossRefMeta.articleNumber;
              if (crossRefMeta.journalName) meta.journalName = crossRefMeta.journalName;
              if (crossRefMeta.publisher) meta.publisher = crossRefMeta.publisher;
              if (crossRefMeta.sourceType) meta.sourceType = crossRefMeta.sourceType;
            }
          }
        } catch (fetchErr) {
          // HTML fetch failed — if we have CrossRef data, that's fine
          if (!meta) throw fetchErr;
        }
      }

      if (!meta || !meta.title) {
        throw new Error("Could not extract metadata from this URL.");
      }

      meta.url = meta.url || inputUrl;
      meta.authors = (meta.authors || []).filter(function(a) { return a && a.trim(); });

      setMetaPreview(meta);
      var citText = formatCitation(meta, style);
      var newCit = { id: uid(), text: citText, style: style, url: inputUrl, meta: meta, createdAt: new Date().toISOString().slice(0, 10) };
      setFolders(function(prev) {
        return prev.map(function(f) {
          if (f.id === activeFolder) return Object.assign({}, f, { citations: [newCit].concat(f.citations) });
          return f;
        });
      });
      setUrl(""); showToast("Citation generated!"); if (inputRef.current) inputRef.current.focus();
    } catch (e) {
      console.error("Generation error:", e);
      setError("" + (e.message || "Failed to generate citation."));
    }
    setLoading(false);
  }

  // ── PDF UPLOAD ──
  function handlePdfSelect(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Please select a PDF file."); return; }
    if (file.size > 30 * 1024 * 1024) { setError("PDF is too large (max 30MB)."); return; }
    setPdfFile(file); setPdfName(file.name); setError("");
  }
  function clearPdf() { setPdfFile(null); setPdfName(""); if (pdfInputRef.current) pdfInputRef.current.value = ""; }

  async function handlePdfGenerate() {
    if (!pdfFile) return;
    setLoading(true); setError(""); setMetaPreview(null);

    try {
      // Step 1: Extract text from PDF
      var pdfText = await extractPdfText(pdfFile);
      var parsed = parsePdfText(pdfText);

      var meta = null;

      // Step 2: If DOI found, fetch from CrossRef (this is the golden path)
      if (parsed.doi) {
        meta = await fetchCrossRef(parsed.doi);
      }

      // Step 3: If no CrossRef data, try to build from PDF text
      if (!meta || !meta.title) {
        meta = meta || {
          authors: [], title: parsed.guessedTitle, publishDate: "", journalName: "",
          volume: "", issue: "", pages: "", articleNumber: "", doi: parsed.doi || "",
          siteName: "", publisher: "", sourceType: "journal", edition: "", description: "",
          url: parsed.doi ? "https://doi.org/" + parsed.doi : "",
        };
      }

      if (!meta.title) {
        throw new Error("Could not extract enough metadata from this PDF. Try pasting the article URL instead.");
      }

      meta.authors = (meta.authors || []).filter(function(a) { return a && a.trim(); });

      setMetaPreview(meta);
      var citText = formatCitation(meta, style);
      var newCit = { id: uid(), text: citText, style: style, url: meta.url || "", meta: meta, createdAt: new Date().toISOString().slice(0, 10) };
      setFolders(function(prev) {
        return prev.map(function(f) {
          if (f.id === activeFolder) return Object.assign({}, f, { citations: [newCit].concat(f.citations) });
          return f;
        });
      });
      clearPdf(); showToast("Citation generated from PDF!");
    } catch (e) {
      console.error("PDF error:", e);
      setError("" + (e.message || "Failed to generate from PDF."));
    }
    setLoading(false);
  }

  // ── Folder ops ──
  function addFolder() { if (!newFolderName.trim()) return; var nf = { id: uid(), name: newFolderName.trim(), citations: [] }; setFolders(function(p) { return p.concat([nf]); }); setActiveFolder(nf.id); setNewFolderName(""); setShowNewFolder(false); }
  function deleteFolder(fid) { if (folders.length <= 1) return; var rem = folders.filter(function(f) { return f.id !== fid; }); setFolders(rem); if (activeFolder === fid) setActiveFolder(rem[0].id); }
  function deleteCitation(cid) { setFolders(function(p) { return p.map(function(f) { if (f.id !== activeFolder) return f; return Object.assign({}, f, { citations: f.citations.filter(function(c) { return c.id !== cid; }) }); }); }); }
  function updateCitation(cid, newText) { setFolders(function(p) { return p.map(function(f) { if (f.id !== activeFolder) return f; return Object.assign({}, f, { citations: f.citations.map(function(c) { return c.id === cid ? Object.assign({}, c, { text: newText }) : c; }) }); }); }); setEditingId(null); }
  function regenerate(c, ns) { var nt = formatCitation(c.meta, ns); setFolders(function(p) { return p.map(function(f) { if (f.id !== activeFolder) return f; return Object.assign({}, f, { citations: f.citations.map(function(x) { return x.id === c.id ? Object.assign({}, x, { text: nt, style: ns }) : x; }) }); }); }); }
  function moveCitation(cid, tid) { var cit = null; setFolders(function(p) { var s1 = p.map(function(f) { if (f.id === activeFolder) { cit = f.citations.find(function(c) { return c.id === cid; }); return Object.assign({}, f, { citations: f.citations.filter(function(c) { return c.id !== cid; }) }); } return f; }); if (!cit) return s1; return s1.map(function(f) { if (f.id === tid) return Object.assign({}, f, { citations: [cit].concat(f.citations) }); return f; }); }); showToast("Moved!"); }
  function exportFolder() { var lines = ["-- " + currentFolder.name + " --", "Exported: " + new Date().toLocaleDateString(), ""]; currentFolder.citations.forEach(function(c, i) { lines.push("[" + (i + 1) + "] (" + c.style + ")"); lines.push(toPlain(c.text)); lines.push(""); }); var blob = new Blob([lines.join("\n")], { type: "text/plain" }); var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = currentFolder.name.replace(/\s+/g, "_") + "_citations.txt"; a.click(); showToast("Exported!"); }
  async function copyAll() { try { await navigator.clipboard.writeText(currentFolder.citations.map(function(c) { return toPlain(c.text); }).join("\n\n")); showToast("All copied!"); } catch (e) {} }

  // ─── UI ───
  var C = { bg: "#F8F8F5", srf: "#FFF", side: "#18181B", acc: "#B45309", accBg: "#FEF3C7", bdr: "#E4E4E7", txt: "#18181B", mut: "#71717A", fnt: "#A1A1AA", red: "#DC2626", grn: "#16A34A" };
  var detectedDoi = url ? extractDOI(url) : null;

  return (
    <div style={{ fontFamily: "'Newsreader', Georgia, serif", background: C.bg, minHeight: "100vh", display: "flex", color: C.txt }}>
      <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, padding: "10px 20px", borderRadius: 8, background: C.txt, color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>{toast}</div>}

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 256 : 0, minWidth: sidebarOpen ? 256 : 0, background: C.side, color: "#fafafa", transition: "width 0.25s, min-width 0.25s", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "26px 22px 18px", borderBottom: "1px solid #27272a" }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.04em" }}>Cite<span style={{ color: C.acc }}>.</span></div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#71717a", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Free Citation Generator</div>
        </div>
        <div style={{ padding: "14px 10px 2px", fontFamily: "'DM Sans', sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#52525b" }}>Projects</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px" }}>
          {folders.map(function(f) {
            var isActive = f.id === activeFolder;
            return (
              <div key={f.id} onClick={function() { setActiveFolder(f.id); }}
                style={{ padding: "9px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, background: isActive ? "#27272a" : "transparent", borderRadius: 7, marginBottom: 1, display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: isActive ? "3px solid " + C.acc : "3px solid transparent" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.name}<span style={{ opacity: 0.35, marginLeft: 8, fontSize: 11 }}>{f.citations.length}</span>
                </span>
                {folders.length > 1 && <span onClick={function(e) { e.stopPropagation(); deleteFolder(f.id); }} style={{ opacity: 0.25, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</span>}
              </div>
            );
          })}
        </div>
        {showNewFolder ? (
          <div style={{ padding: "10px 12px", borderTop: "1px solid #27272a" }}>
            <input value={newFolderName} onChange={function(e) { setNewFolderName(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") addFolder(); }} placeholder="e.g. Bio 101..." autoFocus style={{ width: "100%", padding: "8px 11px", background: "#27272a", border: "1px solid #3f3f46", borderRadius: 7, color: "#fafafa", fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
              <button onClick={addFolder} style={{ flex: 1, padding: 6, background: C.acc, border: "none", borderRadius: 5, color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Create</button>
              <button onClick={function() { setShowNewFolder(false); }} style={{ flex: 1, padding: 6, background: "#27272a", border: "1px solid #3f3f46", borderRadius: 5, color: "#a1a1aa", fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={function() { setShowNewFolder(true); }} style={{ margin: "6px 10px 14px", padding: 9, background: "transparent", border: "1px dashed #3f3f46", borderRadius: 7, color: "#71717a", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>+ New Folder</button>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "14px 26px", borderBottom: "1px solid " + C.bdr, display: "flex", alignItems: "center", gap: 10, background: C.srf }}>
          <button onClick={function() { setSidebarOpen(!sidebarOpen); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.mut, padding: "2px 6px" }}>☰</button>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, flex: 1 }}>
            {currentFolder.name}
            <span style={{ fontWeight: 400, fontSize: 12, color: C.fnt, marginLeft: 10 }}>{currentFolder.citations.length} citation{currentFolder.citations.length !== 1 ? "s" : ""}</span>
          </span>
          {currentFolder.citations.length > 0 && <div style={{ display: "flex", gap: 6 }}>
            <button onClick={copyAll} style={{ padding: "5px 13px", background: C.bg, border: "1px solid " + C.bdr, borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer" }}>Copy All</button>
            <button onClick={exportFolder} style={{ padding: "5px 13px", background: C.bg, border: "1px solid " + C.bdr, borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer" }}>Export .txt</button>
          </div>}
        </div>

        {/* Input */}
        <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid " + C.bdr, background: C.srf }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.mut, display: "block", marginBottom: 5 }}>Paste URL or DOI link</label>
              <input ref={inputRef} value={url} onChange={function(e) { setUrl(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter" && !loading) handleGenerate(); }}
                placeholder="https://doi.org/10.1128/... or any article URL"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid " + C.bdr, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, background: C.bg, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.mut, display: "block", marginBottom: 5 }}>Style</label>
              <select value={style} onChange={function(e) { setStyle(e.target.value); }}
                style={{ padding: "10px 36px 10px 12px", border: "1.5px solid " + C.bdr, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, background: C.bg, cursor: "pointer", outline: "none" }}>
                {STYLES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}
              </select>
            </div>
            <button onClick={handleGenerate} disabled={loading || !url.trim()}
              style={{ padding: "10px 26px", background: loading ? C.mut : C.acc, color: "#fff", border: "none", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer", opacity: !url.trim() ? 0.4 : 1, whiteSpace: "nowrap" }}>
              {loading ? "Fetching..." : "Generate"}
            </button>
          </div>

          {/* OR divider + PDF */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0 6px" }}>
            <div style={{ flex: 1, height: 1, background: C.bdr }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.fnt, textTransform: "uppercase", letterSpacing: "0.08em" }}>or upload a PDF</span>
            <div style={{ flex: 1, height: 1, background: C.bdr }} />
          </div>
          <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" onChange={handlePdfSelect} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={function() { if (pdfInputRef.current) pdfInputRef.current.click(); }} disabled={loading}
              style={{ padding: "9px 18px", background: C.bg, color: C.mut, border: "1.5px dashed " + C.bdr, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📄</span>{pdfName ? "Change PDF" : "Choose PDF"}
            </button>
            {pdfName && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.txt, background: C.accBg, padding: "4px 12px", borderRadius: 6, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>{pdfName}</span>
              <button onClick={clearPdf} style={{ background: "none", border: "none", color: C.fnt, cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
              <button onClick={handlePdfGenerate} disabled={loading}
                style={{ padding: "9px 22px", background: loading ? C.mut : C.acc, color: "#fff", border: "none", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: loading ? "wait" : "pointer" }}>
                {loading ? "Scanning PDF..." : "Generate from PDF"}
              </button>
            </div>}
          </div>

          {detectedDoi && !loading && <div style={{ marginTop: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.acc, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: C.accBg, padding: "2px 8px", borderRadius: 4, fontWeight: 600, fontSize: 11 }}>DOI DETECTED</span>
            <span style={{ color: C.mut }}>{detectedDoi} — will fetch from CrossRef (free)</span>
          </div>}

          {error && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.red, marginTop: 10, padding: "8px 12px", background: "#FEF2F2", borderRadius: 6, border: "1px solid #FECACA" }}>{error}</div>}

          {metaPreview && <div style={{ marginTop: 14, padding: "14px 18px", background: C.accBg, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 12, border: "1px solid #FDE68A" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: C.acc }}>Extracted Metadata</span>
              <button onClick={function() { setMetaPreview(null); }} style={{ padding: "2px 8px", background: "transparent", border: "1px solid #FDE68A", borderRadius: 4, fontSize: 11, cursor: "pointer", color: C.acc, fontFamily: "'DM Sans', sans-serif" }}>Dismiss</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "4px 10px", lineHeight: 1.65 }}>
              {metaPreview.authors && metaPreview.authors.length > 0 && <><span style={{ color: C.mut, fontWeight: 500 }}>Authors</span><span>{metaPreview.authors.join("; ")}</span></>}
              <span style={{ color: C.mut, fontWeight: 500 }}>Title</span><span>{metaPreview.title}</span>
              {metaPreview.sourceType && <><span style={{ color: C.mut, fontWeight: 500 }}>Type</span><span style={{ textTransform: "capitalize" }}>{metaPreview.sourceType}</span></>}
              {metaPreview.publishDate && <><span style={{ color: C.mut, fontWeight: 500 }}>Date</span><span>{metaPreview.publishDate}</span></>}
              {metaPreview.journalName && <><span style={{ color: C.mut, fontWeight: 500 }}>Journal</span><span>{metaPreview.journalName}</span></>}
              {(metaPreview.volume || metaPreview.issue) && <><span style={{ color: C.mut, fontWeight: 500 }}>Vol/Issue</span><span>{metaPreview.volume || "-"}{metaPreview.issue ? " (" + metaPreview.issue + ")" : ""}</span></>}
              {metaPreview.pages && <><span style={{ color: C.mut, fontWeight: 500 }}>Pages</span><span>{metaPreview.pages}</span></>}
              {metaPreview.articleNumber && <><span style={{ color: C.mut, fontWeight: 500 }}>Article #</span><span>{metaPreview.articleNumber}</span></>}
              {metaPreview.doi && <><span style={{ color: C.mut, fontWeight: 500 }}>DOI</span><span>{metaPreview.doi}</span></>}
              {metaPreview.publisher && <><span style={{ color: C.mut, fontWeight: 500 }}>Publisher</span><span>{metaPreview.publisher}</span></>}
            </div>
          </div>}
        </div>

        {/* Citations */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 26px 40px" }}>
          {currentFolder.citations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.12 }}>📚</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.fnt }}>No citations yet.</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.fnt, marginTop: 6, maxWidth: 400, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
                100% free. No AI. No API keys. Extracts metadata from web pages and the CrossRef database to build complete citations.
              </div>
            </div>
          ) : (
            currentFolder.citations.map(function(c) {
              return (
                <div key={c.id} style={{ marginBottom: 10, padding: "16px 20px", background: C.srf, border: "1px solid " + C.bdr, borderRadius: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, background: C.accBg, color: C.acc, padding: "2px 8px", borderRadius: 4 }}>{c.style}</span>
                      {c.meta && c.meta.sourceType && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", background: "#f4f4f5", color: C.mut, padding: "2px 8px", borderRadius: 4 }}>{c.meta.sourceType}</span>}
                    </div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.fnt }}>{c.createdAt}</span>
                  </div>
                  {editingId === c.id ? (
                    <div>
                      <textarea value={editText} onChange={function(e) { setEditText(e.target.value); }} style={{ width: "100%", minHeight: 80, padding: 12, border: "1.5px solid " + C.acc, borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                      <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
                        <button onClick={function() { updateCitation(c.id, editText); }} style={{ padding: "5px 14px", background: C.acc, color: "#fff", border: "none", borderRadius: 5, fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 600 }}>Save</button>
                        <button onClick={function() { setEditingId(null); }} style={{ padding: "5px 14px", background: C.bg, border: "1px solid " + C.bdr, borderRadius: 5, fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.8, color: "#27272a", paddingLeft: 28, textIndent: -28 }}>
                      <RichText text={c.text} />
                    </div>
                  )}
                  {editingId !== c.id && (
                    <div style={{ marginTop: 10, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                      <button onClick={function() { copyFormatted(c.text).then(function(ok) { if (ok) { setCopiedId(c.id); setTimeout(function() { setCopiedId(null); }, 1500); } }); }}
                        style={{ padding: "4px 11px", background: copiedId === c.id ? C.grn : C.bg, color: copiedId === c.id ? "#fff" : C.mut, border: copiedId === c.id ? "none" : "1px solid " + C.bdr, borderRadius: 5, fontFamily: "'DM Sans', sans-serif", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                        {copiedId === c.id ? "✓ Copied" : "Copy"}
                      </button>
                      <button onClick={function() { setEditingId(c.id); setEditText(c.text); }} style={{ padding: "4px 11px", background: C.bg, color: C.mut, border: "1px solid " + C.bdr, borderRadius: 5, fontFamily: "'DM Sans', sans-serif", fontSize: 11, cursor: "pointer" }}>Edit</button>
                      <select value={c.style} onChange={function(e) { regenerate(c, e.target.value); }}
                        style={{ padding: "4px 8px", background: C.bg, border: "1px solid " + C.bdr, borderRadius: 5, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.mut, cursor: "pointer" }}>
                        {STYLES.map(function(s) { return <option key={s} value={s}>{"→ " + s}</option>; })}
                      </select>
                      {folders.length > 1 && <select value="" onChange={function(e) { if (e.target.value) moveCitation(c.id, e.target.value); }}
                        style={{ padding: "4px 8px", background: C.bg, border: "1px solid " + C.bdr, borderRadius: 5, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.mut, cursor: "pointer" }}>
                        <option value="">Move to...</option>
                        {folders.filter(function(f) { return f.id !== activeFolder; }).map(function(f) { return <option key={f.id} value={f.id}>{f.name}</option>; })}
                      </select>}
                      <div style={{ flex: 1 }} />
                      <button onClick={function() { deleteCitation(c.id); }} style={{ padding: "4px 8px", background: "transparent", color: C.red, border: "none", fontFamily: "'DM Sans', sans-serif", fontSize: 11, cursor: "pointer", opacity: 0.35 }}>Delete</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
