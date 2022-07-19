Contains some [Interval](https://interval.com) apps for working with Spotify data.

These actions require a Spotify account and a registered Spotify app. [You can register a new app here.](https://developer.spotify.com/dashboard/login)

After creating your app, add the client ID and client secret to the `.env` file, along with your Interval API key. You'll also need to add the **exact** URL of your Interval action to the Spotify developer dashboard in order for the OAuth flow to work. In development mode it will look like this:

```
https://interval.com/dashboard/<ORG_SLUG>/develop/actions/<ACTION_SLUG>
```

After you run your Interval action for the first time, copy the URL. Then, in the Spotify developer dashboard:

1. Click **Edit Settings**
2. Go to the **Redirect URIs** section
3. Paste the action URL into the text input
4. Click **Add**

If you get an `Invalid Redirect URI` error, double check that the action URL in your browser matches the URL you added to Spotify.

---

### Included actions

- `monthly_likes_playlist`: Creates a playlist containing your likes for a given month.
