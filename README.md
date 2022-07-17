Contains some [Interval](https://interval.com) apps for working with Spotify data.

These actions require a Spotify account and a registered Spotify app. You can register a new app here: https://developer.spotify.com/dashboard/login

After creating your app, add the client ID and client secret to the `.env` file, along with your Interval API key and org slug. The org slug is required for constructing the OAuth redirect URI, which must **exactly** match the URL of your Interval action. It will look like this:

```
https://interval.com/dashboard/<ORG_SLUG>/develop/actions/<ACTION_SLUG>
```

The URI is constructed within the `monthly_likes_playlist` action in `src/index.ts`. See the instructions there if you want to change the action slug.

---

### Included actions

- `monthly_likes_playlist`: Creates a playlist containing your likes for a given month.
