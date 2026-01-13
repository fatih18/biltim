const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY

export async function POST() {
  try {
    // API anahtarını kontrol edelim
    console.log(
      'API Key (ilk 5 karakter):',
      HEYGEN_API_KEY ? `${HEYGEN_API_KEY.substring(0, 5)}...` : 'undefined'
    )

    if (!HEYGEN_API_KEY) {
      throw new Error('API key is missing from .env')
    }

    const res = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'x-api-key': HEYGEN_API_KEY,
      },
    })

    // Yanıt durumunu kontrol edelim
    console.log('API yanıt durumu:', res.status, res.statusText)

    const data = await res.json()
    console.log('API yanıt veri özeti:', `${JSON.stringify(data).substring(0, 100)}...`)

    return new Response(data.data.token, {
      status: 200,
    })
  } catch (error) {
    console.error('Error retrieving access token:', error)

    return new Response('Failed to retrieve access token', {
      status: 500,
    })
  }
}
