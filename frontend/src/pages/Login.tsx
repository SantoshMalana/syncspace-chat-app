import { useState } from "react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Login Data:", { email, password });
  };

 return (
  <div className="min-h-screen flex items-center justify-center bg-bg">

    {/* Glass Effect Wrapper */}
    <div className="backdrop-blur-lg bg-black/40 p-6 rounded-3xl">

      {/* Card */}
      <div
        className="w-full max-w-md bg-card p-8 rounded-2xl
        border border-gray-700 shadow-xl"
      >

        {/* Logo */}
        <h1
          className="text-3xl font-bold text-center text-primary mb-2
          drop-shadow-[0_0_12px_#06B6D4]"
        >
          SyncSpace
        </h1>

        <p className="text-center text-gray-400 mb-6">
          Work. Connect. Collaborate.
        </p>

        <h2 className="text-xl font-semibold text-textlight mb-6 text-center">
          Welcome Back 👋
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="
              w-full px-4 py-2 rounded-lg
              bg-zinc-900 text-white
              border border-gray-600
              focus:outline-none
              focus:border-primary
              focus:ring-1 focus:ring-primary
              transition"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="
              w-full px-4 py-2 rounded-lg
              bg-zinc-900 text-white
              border border-gray-600
              focus:outline-none
              focus:border-primary
              focus:ring-1 focus:ring-primary
              transition"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            className="
            w-full py-2 rounded-lg font-semibold text-black
            bg-gradient-to-r from-primary to-secondary
            hover:shadow-glow hover:scale-[1.02]
            transition-all duration-200"
          >
            Sign In
          </button>

        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-400">

          <p className="mb-2 hover:text-primary cursor-pointer">
            Forgot Password?
          </p>

          <p>
            Don’t have an account?{" "}
            <span className="text-accent font-medium cursor-pointer hover:underline">
              Sign Up
            </span>
          </p>

        </div>

      </div>

    </div>

  </div>
);
};

export default Login;
