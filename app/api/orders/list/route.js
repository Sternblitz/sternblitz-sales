// app/api/orders/list/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// === Date helpers ===
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function startOfNDaysAgo(n) { const d = startOfToday(); d.setDate(d.getDate() - n); return d; }
function toISO(d) { return new Date(d).toISOString(); }

const RANGE_MAP = {
  all: { label: "Gesamter Zeitraum" },
  "7d": { label: "Letzte 7 Tage", gte: () => startOfNDaysAgo(6), lt: () => new Date() },
  "30d": { label: "Letzte 30 Tage", gte: () => startOfNDaysAgo(29), lt: () => new Date() },
};

const MANAGER_KEYS = [
  "team_lead_id",
  "manager_id",
  "lead_id",
  "teamlead_id",
  "supervisor_id",
];

const normalizeRole = (role) => (role || "").toString().toLowerCase();

const safeFirstName = (profile = {}, user = {}) => {
  const meta = user?.user_metadata || {};
  return (
    profile.first_name ||
    meta.first_name ||
    meta.firstName ||
    meta.given_name ||
    (meta.name ? meta.name.split(" ")[0] : null) ||
    (user.email ? user.email.split("@")[0] : "")
  );
};

const safeLastName = (profile = {}, user = {}) => {
  const meta = user?.user_metadata || {};
  return profile.last_name || meta.last_name || meta.surname || "";
};

function resolveRange(rangeKey) {
  const fallback = RANGE_MAP["30d"];
  const key = RANGE_MAP[rangeKey] ? rangeKey : "30d";
  const cfg = RANGE_MAP[key] || fallback;
  const gte = typeof cfg.gte === "function" ? cfg.gte() : null;
  const lt = typeof cfg.lt === "function" ? cfg.lt() : null;
  return { key, label: cfg.label, gte, lt };
}

function getManagerId(profile) {
  if (!profile) return null;
  for (const key of MANAGER_KEYS) {
    if (profile[key]) return profile[key];
  }
  return null;
}

function normalizeProfile(raw = {}, user) {
  return {
    id: raw.id || user?.id,
    role: normalizeRole(raw.role || user?.role),
    firstName: raw.first_name || raw.firstName || safeFirstName(raw, user),
    lastName: raw.last_name || raw.lastName || safeLastName(raw, user),
    email: raw.email || user?.email || null,
    managerId: getManagerId(raw),
  };
}

function formatOrdersHierarchy(role, currentUserId, profiles, orders, rangeLabel) {
  const profileMap = new Map();
  profiles.forEach((p) => {
    if (p?.id) profileMap.set(p.id, p);
  });

  const orderBuckets = new Map();
  orders.forEach((order) => {
    const owner = order.source_account_id || "__unknown__";
    if (!orderBuckets.has(owner)) orderBuckets.set(owner, []);
    orderBuckets.get(owner).push(order);
  });

  const orphanOrders = orderBuckets.get("__unknown__") || [];

  const managerMap = new Map();
  profiles.forEach((profile) => {
    const managerId = profile.managerId;
    if (!managerId) return;
    if (!managerMap.has(managerId)) managerMap.set(managerId, []);
    managerMap.get(managerId).push(profile);
  });

  const buildMember = (profile, isLead = false) => {
    const userOrders = orderBuckets.get(profile.id) || [];
    return {
      profile,
      isLead,
      totalOrders: userOrders.length,
      orders: userOrders,
    };
  };

  if (role === "admin") {
    const teams = [];
    const leads = profiles.filter((p) => normalizeRole(p.role) === "team_lead");
    const handled = new Set();

    leads.forEach((lead) => {
      const members = (managerMap.get(lead.id) || [])
        .filter((m) => m.id !== lead.id)
        .map((member) => buildMember(member, false));
      const leadMember = buildMember(lead, true);
      const teamMembers = [leadMember, ...members].sort((a, b) => b.totalOrders - a.totalOrders);
      teamMembers.forEach((m) => handled.add(m.profile.id));
      teams.push({
        id: lead.id,
        lead,
        members: teamMembers,
        totalOrders: teamMembers.reduce((sum, m) => sum + m.totalOrders, 0),
      });
    });

    // Collect reps that are not tied to a lead
    const unassigned = profiles
      .filter((p) => !handled.has(p.id) && normalizeRole(p.role) === "sales")
      .map((p) => buildMember(p, false))
      .filter(Boolean);

    if (orphanOrders.length) {
      unassigned.push({
        profile: {
          id: "__unknown__",
          firstName: "Unbekannter Account",
          lastName: "",
        },
        isLead: false,
        totalOrders: orphanOrders.length,
        orders: orphanOrders,
      });
    }

    return { teams, unassigned, rangeLabel };
  }

  if (role === "team_lead") {
    const selfProfile = profileMap.get(currentUserId);
    const members = (managerMap.get(currentUserId) || []).filter((m) => m.id !== currentUserId);
    const allMembers = [selfProfile, ...members.filter(Boolean)];
    const mapped = allMembers
      .filter(Boolean)
      .map((member) => buildMember(member, member.id === currentUserId))
      .sort((a, b) => b.totalOrders - a.totalOrders);

    const response = {
      teams: [
        {
          id: currentUserId,
          lead: selfProfile,
          members: mapped,
          totalOrders: mapped.reduce((sum, m) => sum + m.totalOrders, 0),
        },
      ],
      unassigned: [],
      rangeLabel,
    };

    if (orphanOrders.length) {
      response.unassigned.push({
        profile: {
          id: "__unknown__",
          firstName: "Unbekannter Account",
          lastName: "",
        },
        isLead: false,
        totalOrders: orphanOrders.length,
        orders: orphanOrders,
      });
    }

    return response;
  }

  // sales
  const selfProfile = profileMap.get(currentUserId) || null;
  const selfMember = selfProfile ? [buildMember(selfProfile, true)] : [];
  const unassigned = [];
  if (orphanOrders.length) {
    unassigned.push({
      profile: {
        id: "__unknown__",
        firstName: "Unbekannter Account",
        lastName: "",
      },
      isLead: false,
      totalOrders: orphanOrders.length,
      orders: orphanOrders,
    });
  }

  return {
    teams: selfProfile
      ? [
          {
            id: currentUserId,
            lead: selfProfile,
            members: selfMember,
            totalOrders: selfMember.reduce((sum, m) => sum + m.totalOrders, 0),
          },
        ]
      : [],
    unassigned,
    rangeLabel,
  };
}

function applyFilters(query, { gte, lt, userIds }) {
  let q = query;
  if (gte) q = q.gte("created_at", toISO(gte));
  if (lt) q = q.lt("created_at", toISO(lt));
  if (Array.isArray(userIds) && userIds.length > 0) q = q.in("source_account_id", userIds);
  return q;
}

async function fetchCount(adminClient, { gte, lt, userIds }) {
  const { count, error } = await applyFilters(
    adminClient.from("leads").select("id", { head: true, count: "exact" }),
    { gte, lt, userIds }
  );
  if (error) throw error;
  return count ?? 0;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedRange = (searchParams.get("range") || "30d").toString();

    const cookieStore = cookies();
    const serverClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await serverClient.auth.getUser();

    if (userError) throw userError;
    if (!user) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    let profile = null;
    try {
      const { data: prof, error: profError } = await admin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (profError) throw profError;
      profile = prof || null;
    } catch (err) {
      console.warn("profiles lookup failed", err?.message);
    }

    const role = normalizeRole(profile?.role || user?.user_metadata?.role || "sales");
    const firstName = safeFirstName(profile, user);
    const lastName = safeLastName(profile, user);

    let allProfiles = [];
    if (role === "admin" || role === "team_lead") {
      try {
        const { data: profilesData, error: profilesError } = await admin.from("profiles").select("*");
        if (profilesError) throw profilesError;
        allProfiles = profilesData?.map((p) => normalizeProfile(p)) || [];
      } catch (err) {
        console.warn("profiles list failed", err?.message);
      }
    }

    // Ensure the current user is present in the profile list for consistent rendering
    const selfProfile = normalizeProfile(profile || {}, user);
    if (!allProfiles.some((p) => p.id === selfProfile.id)) {
      allProfiles.push(selfProfile);
    }

    const accessibleUserIds = new Set([selfProfile.id]);
    if (role === "team_lead") {
      allProfiles.forEach((p) => {
        if (p.managerId === selfProfile.id) accessibleUserIds.add(p.id);
      });
    }

    const { key: rangeKey, label: rangeLabel, gte, lt } = resolveRange(requestedRange);

    const selectColumns = `
      id,
      created_at,
      google_profile,
      google_url,
      company,
      first_name,
      last_name,
      email,
      phone,
      selected_option,
      counts,
      pdf_path,
      pdf_signed_url,
      source_account_id
    `;

    const filterOptions = {
      gte,
      lt,
      userIds: role === "admin" ? null : Array.from(accessibleUserIds),
    };

    const { data: orders, error: ordersError } = await applyFilters(
      admin
        .from("leads")
        .select(selectColumns)
        .order("created_at", { ascending: false })
        .limit(500),
      filterOptions
    );

    if (ordersError) throw ordersError;

    const knownProfileIds = new Set(allProfiles.map((p) => p.id));
    (orders || []).forEach((order) => {
      const ownerId = order.source_account_id;
      if (!ownerId || knownProfileIds.has(ownerId)) return;
      allProfiles.push({
        id: ownerId,
        role: "sales",
        firstName: "",
        lastName: "",
        email: null,
        managerId: null,
      });
      knownProfileIds.add(ownerId);
    });

    const totals = {};
    const countRanges = [
      { key: "all", opts: { gte: null, lt: null } },
      { key: "30d", opts: { gte: startOfNDaysAgo(29), lt: new Date() } },
      { key: "7d", opts: { gte: startOfNDaysAgo(6), lt: new Date() } },
    ];

    for (const entry of countRanges) {
      const opts = {
        ...entry.opts,
        userIds: filterOptions.userIds,
      };
      totals[entry.key] = await fetchCount(admin, opts);
    }

    const hierarchy = formatOrdersHierarchy(
      role,
      selfProfile.id,
      allProfiles,
      orders || [],
      rangeLabel
    );

    return NextResponse.json({
      ok: true,
      role,
      profile: {
        id: selfProfile.id,
        firstName,
        lastName,
        fullName: [firstName, lastName].filter(Boolean).join(" "),
      },
      range: rangeKey,
      rangeLabel,
      totals: {
        all: totals.all ?? 0,
        last30d: totals["30d"] ?? 0,
        last7d: totals["7d"] ?? 0,
        current: orders?.length ?? 0,
      },
      orders: orders || [],
      hierarchy,
    });
  } catch (e) {
    console.error("orders/list error", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
