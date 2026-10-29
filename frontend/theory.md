# Architecture & Theory Concepts (theory.md)

> **Note for Future AI Agents:**
> This file records key architectural, security, system design, and technical concepts explained and learned throughout development sessions in this workspace.
> When explaining new non-trivial technical concepts, workflow mechanics, or architectural choices to the user, **always update this file** with clean, concise, to-the-point bullet points and diagrams. Keep explanations high-signal and easy to scan.

---

## 1. Supabase OAuth Redirect Flow (`redirectTo: window.location.origin`)

### Core Concept
In OAuth-based authentication (e.g., GitHub, Google via Supabase Auth), `redirectTo` specifies where **Supabase Auth Server** should send the user *after* completing token exchange and session creation.

### Authentication Lifecycle
```
[User] -> [React Frontend] 
              | 1. signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } })
              v
[GitHub Login Page] (User authenticates & grants permissions)
              | 2. Redirects to Provider Callback URL (configured in GitHub app settings)
              v
[Supabase Auth Server Callback] (`https://<project-ref>.supabase.co/auth/v1/callback`)
              | 3. Exchanges code for session tokens & creates Supabase session
              | 4. Redirects user to specified `redirectTo` URL (`window.location.origin`)
              v
[React Frontend] (`http://localhost:5173` or `https://<your-app>.vercel.app`)
              | 5. Supabase JS SDK parses tokens/hash from URL
              v
[AuthContext State Updated] (`user` & `token` populated via `onAuthStateChange`)
```

### Key Technical Takeaways
1. **Supabase Callback vs. Frontend Redirect**:
   - **GitHub Callback URL**: Must point to Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`).
   - **`redirectTo` Option**: Must point to your **Frontend Application URL** where the user lands post-login. Setting `redirectTo` to the Supabase endpoint creates redundant callback loops.
2. **Environment Portability**:
   - Hardcoding specific localhost/production URLs in code breaks portability.
   - Using `window.location.origin` dynamically adapts across `http://localhost:5173`, `http://localhost:5174`, or production domains (`https://resume-x-analyzer.vercel.app`).
3. **Allowed Redirect URLs**:
   - Target origins used in `window.location.origin` must be registered in **Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs**.

---

## 2. Token Propagation & API Authentication Flow

### Core Concept
Decoupled client-side authentication relies on state hydration in React Context and passing Bearer JSON Web Tokens (JWT) via standard HTTP `Authorization` headers to downstream API endpoints (e.g., `/api/analyze`).

### Lifecycle & Mechanics
1. **Session Hydration**: Supabase SDK maintains persistent session tokens in browser storage (`localStorage`) and emits state updates via `onAuthStateChange`.
2. **Context Provider**: [`AuthContext`](file:///home/frontier/projects/agentic-sol/frontend/src/context/AuthContext.tsx) consumes session state and exposes `user` and `token` (JWT access token) to components.
3. **Header Injection**: Client API request handlers inspect `token` state and attach it to request headers:
   ```typescript
   headers['Authorization'] = `Bearer ${token}`;
   ```
4. **Backend Route Processing**: Backend endpoints (e.g. `/api/analyze` in FastAPI) receive requests with standard OAuth/JWT headers for authorization validation.
