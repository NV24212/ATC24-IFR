http:
  routers:
    # This router handles HTTP traffic and redirects it to HTTPS
    app-router-http:
      rule: Host(`api.hasmah.xyz`)
      service: app-service
      middlewares:
        - redirect-to-https
      entryPoints:
        - web

    # This router handles the secure HTTPS traffic
    app-router-https:
      rule: Host(`api.hasmah.xyz`)
      service: app-service
      middlewares: [] # No prefix stripping is needed
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

  middlewares:
    redirect-to-https:
      redirectScheme:
        scheme: https
        permanent: true

  services:
    app-service:
      loadBalancer:
        servers:
          - url: http://ifr24-24ifr-kud935:5000
        passHostHeader: true
