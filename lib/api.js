const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000/api";

export async function apiRequest(
    endpoint,
    options = {}
) {
    const response =
        await fetch(
            `${API_URL}${endpoint}`,
            {
                ...options,

                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            }
        );

    let data;

    try {
        data = await response.json();
    } catch {
        data = {
            success: false,
            message:
                "Invalid server response"
        };
    }

    return data;
}