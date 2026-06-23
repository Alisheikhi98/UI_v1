const API_URL = "http://localhost:8000"

export async function loginUser(username: string, password: string) {
  const form = new URLSearchParams()
  form.append("username", username)
  form.append("password", password)

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  })

  if (!res.ok) {
    throw new Error("Login failed")
  }

  return res.json()
}

export async function registerUser(data: {
  username: string
  full_name: string
  phone_number: string
  email?: string | null
  password: string
}) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: data.username,
      full_name: data.full_name,
      phone_number: data.phone_number,
      email: data.email ?? null,
      password: data.password,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || "Register failed")
  }

  return res.json()
}
