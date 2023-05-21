Contains some [Interval](https://interval.com) utilities for working with Spotify data.

Click the button below to deploy this app on [Railway](https://railway.app):

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/guuaR3?referralCode=PWTwBP)

Requires a Spotify account and a registered Spotify app. [You can register a new app here.](https://developer.spotify.com/dashboard/login)

After creating your app, add the client ID and client secret to the `.env` file, along with your Interval API key.

You'll also need to add the authorization URLs to the Spotify developer dashboard in order for the OAuth flow to work. [Interval actions have two modes](https://interval.com/docs/concepts/environments): Dev mode and Live mode. You'll need to add both URLs to the Spotify developer dashboard:

```
// dev mode
https://interval.com/dashboard/<ORG_SLUG>/develop/actions/spotify/authorize
// live mode
https://interval.com/dashboard/<ORG_SLUG>/actions/spotify/authorize
```

To add these URLs in the Spotify developer dashboard:

1. Click **Edit Settings**
2. Go to the **Redirect URIs** section
3. Paste each URL into the text input and click **Add**

If you get an `Invalid Redirect URI` error, double check that the action URL in your browser matches the URL you added to Spotify.
