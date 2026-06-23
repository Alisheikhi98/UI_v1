const API_URL = "http://localhost:8000"

export async function loginUser(email: string, password: string) {
  const form = new URLSearchParams()
  form.append("username", email)
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
  full_name: string
  email: string
  phone: string
  personnel_code: string
  password: string
}) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || "Register failed")
  }

  return res.json()
}