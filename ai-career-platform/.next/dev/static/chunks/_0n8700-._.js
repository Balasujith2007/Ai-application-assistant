(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/context/AuthContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function AuthProvider({ children }) {
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    // Restore session on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            const restoreSession = {
                "AuthProvider.useEffect.restoreSession": async ()=>{
                    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getToken"])();
                    const storedUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getStoredUser"])();
                    if (token && storedUser) {
                        setUser(storedUser);
                        // Optionally verify token against /auth/me
                        try {
                            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get('/auth/me');
                            const freshUser = res.data.data;
                            setUser(freshUser);
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setStoredUser"])(freshUser);
                        } catch  {
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["removeToken"])();
                            setUser(null);
                        }
                    }
                    setIsLoading(false);
                }
            }["AuthProvider.useEffect.restoreSession"];
            restoreSession();
        }
    }["AuthProvider.useEffect"], []);
    const login = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[login]": async (email, password)=>{
            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post('/auth/login', {
                email,
                password
            });
            const { user: loggedInUser, token } = res.data.data;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setToken"])(token);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setStoredUser"])(loggedInUser);
            setUser(loggedInUser);
            router.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDashboardRoute"])(loggedInUser.role));
        }
    }["AuthProvider.useCallback[login]"], [
        router
    ]);
    const register = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[register]": async (name, email, password, role, department, employeeId)=>{
            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post('/auth/register', {
                name,
                email,
                password,
                role,
                department,
                employeeId
            });
            const { user: newUser, token } = res.data.data;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setToken"])(token);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setStoredUser"])(newUser);
            setUser(newUser);
            router.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDashboardRoute"])(newUser.role));
        }
    }["AuthProvider.useCallback[register]"], [
        router
    ]);
    const loginWithToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[loginWithToken]": (token, loggedInUser)=>{
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setToken"])(token);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setStoredUser"])(loggedInUser);
            setUser(loggedInUser);
        }
    }["AuthProvider.useCallback[loginWithToken]"], []);
    const logout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[logout]": ()=>{
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["removeToken"])();
            setUser(null);
            router.push('/login');
        }
    }["AuthProvider.useCallback[logout]"], [
        router
    ]);
    const refreshUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[refreshUser]": async ()=>{
            try {
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get('/auth/me');
                const freshUser = res.data.data;
                setUser(freshUser);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setStoredUser"])(freshUser);
            } catch  {
                logout();
            }
        }
    }["AuthProvider.useCallback[refreshUser]"], [
        logout
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            register,
            loginWithToken,
            logout,
            refreshUser
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/context/AuthContext.tsx",
        lineNumber: 130,
        columnNumber: 5
    }, this);
}
_s(AuthProvider, "5Cd/dYwBxrD4SnxGA1E+piPj1Ds=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = AuthProvider;
function useAuth() {
    _s1();
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
_s1(useAuth, "/dMy7t63NXD4eYACoT93CePwGrg=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/context/PlacementContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PlacementProvider",
    ()=>PlacementProvider,
    "usePlacement",
    ()=>usePlacement
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/placementApi.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
const INITIAL_PROFILE = {
    name: 'Student',
    email: 'student@example.com',
    cgpa: 0,
    skills: [],
    department: '',
    year: 0,
    college: ''
};
const PlacementContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function PlacementProvider({ children }) {
    _s();
    const [studentProfile, setStudentProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(INITIAL_PROFILE);
    const [applications, setApplications] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [interviews, setInterviews] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [tasks, setTasks] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [opportunities, setOpportunities] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [activities, setActivities] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [dashboardStats, setDashboardStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const fetchData = async ()=>{
        if (("TURBOPACK compile-time value", "object") !== 'undefined' && !localStorage.getItem('token')) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [dashboardData, appsData, tasksData, interviewsData, oppsData] = await Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDashboardStats"](),
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getApplications"](),
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTasks"](),
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getInterviews"](),
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getRecommendedOpportunities"]()
            ]);
            setDashboardStats(dashboardData);
            setApplications(appsData);
            setTasks(tasksData);
            setInterviews(interviewsData);
            setOpportunities(oppsData);
            setActivities(dashboardData?.activities || []); // Activity feed if returned by dashboard
        } catch (error) {
            console.error('Failed to fetch placement data', error);
        } finally{
            setIsLoading(false);
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PlacementProvider.useEffect": ()=>{
            fetchData();
        }
    }["PlacementProvider.useEffect"], []);
    const refreshDashboard = async ()=>{
        try {
            const dashboardData = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDashboardStats"]();
            setDashboardStats(dashboardData.data || dashboardData);
        } catch (e) {}
    };
    const addApplication = async (app)=>{
        try {
            const newApp = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createApplication"](app);
            setApplications((prev)=>[
                    newApp,
                    ...prev
                ]);
            refreshDashboard();
        } catch (e) {
            console.error(e);
        }
    };
    const updateApplication = async (id, appData)=>{
        try {
            const updated = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateApplication"](id, appData);
            setApplications((prev)=>prev.map((a)=>a.id === id ? updated : a));
            refreshDashboard();
        } catch (e) {
            console.error(e);
        }
    };
    const updateApplicationStatus = async (id, status)=>{
        return updateApplication(id, {
            status
        });
    };
    const deleteApplication = async (id)=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteApplication"](id);
            setApplications((prev)=>prev.filter((a)=>a.id !== id));
            refreshDashboard();
        } catch (e) {
            console.error(e);
        }
    };
    const addNoteToApplication = async (id, note)=>{
        const app = applications.find((a)=>a.id === id);
        if (!app) return;
        const existingNotes = app.notes ? `${app.notes}\n` : '';
        const newNotes = `${existingNotes}[${new Date().toLocaleDateString()}] ${note}`;
        return updateApplication(id, {
            notes: newNotes
        });
    };
    const scheduleInterview = async (interviewData)=>{
        try {
            const newInt = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createInterview"](interviewData);
            setInterviews((prev)=>[
                    newInt,
                    ...prev
                ]);
            refreshDashboard();
        } catch (e) {
            console.error(e);
        }
    };
    const updateInterview = async (id, data)=>{
        try {
            const updated = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateInterview"](id, data);
            setInterviews((prev)=>prev.map((i)=>i.id === id ? updated : i));
        } catch (e) {
            console.error(e);
        }
    };
    const deleteInterview = async (id)=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteInterview"](id);
            setInterviews((prev)=>prev.filter((i)=>i.id !== id));
            refreshDashboard();
        } catch (e) {
            console.error(e);
        }
    };
    const addTask = async (taskData)=>{
        try {
            const newTask = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createTask"](taskData);
            setTasks((prev)=>[
                    newTask,
                    ...prev
                ]);
            refreshDashboard();
        } catch (e) {
            console.error(e);
        }
    };
    const toggleTask = async (id)=>{
        try {
            const updated = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toggleTaskComplete"](id);
            setTasks((prev)=>prev.map((t)=>t.id === id ? updated : t));
        } catch (e) {
            console.error(e);
        }
    };
    const updateTask = async (id, data)=>{
        try {
            const updated = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateTask"](id, data);
            setTasks((prev)=>prev.map((t)=>t.id === id ? updated : t));
        } catch (e) {
            console.error(e);
        }
    };
    const deleteTask = async (id)=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$placementApi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteTask"](id);
            setTasks((prev)=>prev.filter((t)=>t.id !== id));
            refreshDashboard();
        } catch (e) {
            console.error(e);
        }
    };
    const applyToOpportunity = async (opp)=>{
        const existing = applications.find((a)=>a.companyName?.toLowerCase() === opp.companyName.toLowerCase());
        if (existing) return;
        await addApplication({
            companyName: opp.companyName,
            position: opp.role,
            location: opp.location || '',
            salary: opp.package || '',
            applicationType: opp.type,
            status: 'APPLIED',
            appliedDate: new Date().toISOString(),
            notes: `Applied via Placement Portal`,
            description: opp.description
        });
    };
    // Stats calculation fallback (uses dashboardStats if available)
    const dStats = dashboardStats?.stats || {};
    const totalApplications = dStats.total || applications.length;
    const activeApplications = dStats.active || applications.filter((a)=>a.status === 'APPLIED' || a.status === 'SHORTLISTED' || a.status === 'INTERVIEW').length;
    const interviewsCount = dStats.interviews || applications.filter((a)=>a.status === 'INTERVIEW').length;
    const offersCount = dStats.selected || applications.filter((a)=>a.status === 'SELECTED').length;
    const rejectedCount = applications.filter((a)=>a.status === 'REJECTED').length;
    const upcomingInterviewsCount = interviews.filter((i)=>!i.result || i.result === 'Pending').length;
    const completedInterviewsCount = interviews.filter((i)=>i.result && i.result !== 'Pending').length;
    const interviewsThisWeekCount = upcomingInterviewsCount;
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysTasksCount = tasks.filter((t)=>t.dueDate?.startsWith(todayStr) && !t.completed).length;
    const upcomingTasksCount = tasks.filter((t)=>!t.completed && !t.dueDate?.startsWith(todayStr)).length;
    const overdueTasksCount = 0;
    const completedTasksCount = tasks.filter((t)=>t.completed).length;
    const stats = {
        totalApplications,
        activeApplications,
        interviewsCount,
        offersCount,
        rejectedCount,
        upcomingInterviewsCount,
        completedInterviewsCount,
        interviewsThisWeekCount,
        todaysTasksCount,
        upcomingTasksCount,
        overdueTasksCount,
        completedTasksCount,
        profileCompletionPct: dashboardStats?.profileCompletion || 0,
        resumeScorePct: dashboardStats?.resumeScore || 0
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PlacementContext.Provider, {
        value: {
            studentProfile: dashboardStats?.user || studentProfile,
            applications,
            interviews,
            tasks,
            opportunities,
            activities,
            isLoading,
            addApplication,
            updateApplication,
            updateApplicationStatus,
            deleteApplication,
            addNoteToApplication,
            scheduleInterview,
            updateInterview,
            deleteInterview,
            addTask,
            toggleTask,
            updateTask,
            deleteTask,
            applyToOpportunity,
            stats
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/context/PlacementContext.tsx",
        lineNumber: 279,
        columnNumber: 5
    }, this);
}
_s(PlacementProvider, "g8yRmZADtZgywA+WQFadY2QYKmI=");
_c = PlacementProvider;
function usePlacement() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(PlacementContext);
    if (!context) {
        throw new Error('usePlacement must be used within a PlacementProvider');
    }
    return context;
}
_s1(usePlacement, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "PlacementProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-client] (ecmascript)");
;
const API_BASE_URL = ("TURBOPACK compile-time value", "/api") || '/api';
const api = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});
// Request interceptor — attach JWT
api.interceptors.request.use((config)=>{
    if ("TURBOPACK compile-time truthy", 1) {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, (error)=>Promise.reject(error));
// Response interceptor — handle 401
api.interceptors.response.use((response)=>response, (error)=>{
    if (error.response?.status === 401 && ("TURBOPACK compile-time value", "object") !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});
const __TURBOPACK__default__export__ = api;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/auth.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TOKEN_KEY",
    ()=>TOKEN_KEY,
    "USER_KEY",
    ()=>USER_KEY,
    "getDashboardRoute",
    ()=>getDashboardRoute,
    "getStoredUser",
    ()=>getStoredUser,
    "getToken",
    ()=>getToken,
    "removeToken",
    ()=>removeToken,
    "setStoredUser",
    ()=>setStoredUser,
    "setToken",
    ()=>setToken
]);
const TOKEN_KEY = 'token';
const USER_KEY = 'user';
function getToken() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}
function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}
function getStoredUser() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch  {
        return null;
    }
}
function setStoredUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function getDashboardRoute(role) {
    const routes = {
        STUDENT: '/dashboard/student',
        MENTOR: '/dashboard/mentor',
        FACULTY: '/dashboard/faculty',
        HOD: '/dashboard/hod',
        PLACEMENT_CELL: '/dashboard/placement',
        ADMIN: '/dashboard/admin'
    };
    return routes[role] || '/dashboard/student';
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/placementApi.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createApplication",
    ()=>createApplication,
    "createInterview",
    ()=>createInterview,
    "createTask",
    ()=>createTask,
    "deleteApplication",
    ()=>deleteApplication,
    "deleteInterview",
    ()=>deleteInterview,
    "deleteTask",
    ()=>deleteTask,
    "getApplications",
    ()=>getApplications,
    "getDashboardStats",
    ()=>getDashboardStats,
    "getInterviews",
    ()=>getInterviews,
    "getNotifications",
    ()=>getNotifications,
    "getRecommendedOpportunities",
    ()=>getRecommendedOpportunities,
    "getTasks",
    ()=>getTasks,
    "markNotificationRead",
    ()=>markNotificationRead,
    "toggleTaskComplete",
    ()=>toggleTaskComplete,
    "updateApplication",
    ()=>updateApplication,
    "updateInterview",
    ()=>updateInterview,
    "updateTask",
    ()=>updateTask
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
;
const getDashboardStats = async ()=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get('/dashboard/student');
    return res.data;
};
const getApplications = async (filters)=>{
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`/applications?${params.toString()}`);
    return res.data;
};
const createApplication = async (data)=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post('/applications', data);
    return res.data;
};
const updateApplication = async (id, data)=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`/applications/${id}`, data);
    return res.data;
};
const deleteApplication = async (id)=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].delete(`/applications/${id}`);
    return res.data;
};
const getTasks = async ()=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get('/tasks');
    return res.data;
};
const createTask = async (data)=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post('/tasks', data);
    return res.data;
};
const updateTask = async (id, data)=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`/tasks/${id}`, data);
    return res.data;
};
const toggleTaskComplete = async (id)=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].patch(`/tasks/${id}/toggle`);
    return res.data;
};
const deleteTask = async (id)=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].delete(`/tasks/${id}`);
    return res.data;
};
const getInterviews = async ()=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get('/interviews');
    return res.data;
};
const createInterview = async (data)=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post('/interviews', data);
    return res.data;
};
const updateInterview = async (id, data)=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`/interviews/${id}`, data);
    return res.data;
};
const deleteInterview = async (id)=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].delete(`/interviews/${id}`);
    return res.data;
};
const getRecommendedOpportunities = async ()=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get('/opportunities/recommended');
    return res.data;
};
const getNotifications = async ()=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get('/notifications');
    return res.data;
};
const markNotificationRead = async (id)=>{
    const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].patch(`/notifications/${id}/read`);
    return res.data;
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_0n8700-._.js.map