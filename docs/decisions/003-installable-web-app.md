# 3. Installable web app (PWA), not a native app

Date: 2026-11-12\
Status: Accepted

## Context

I'll use the app on my phone at the gym, tapping off sets between lifts. It
needs to feel like an app on my home screen, work on any phone (friends and
family may use it), and build on the JavaScript I already know.

## Decision

Build a phone-friendly website that can be installed to the home screen as a
progressive web app (PWA).

## Alternatives considered

- Native iOS/Android apps: separate languages and toolchains per platform, plus
  app store review. Too much new ground at once.
- A cross-platform native framework (e.g. React Native): closer to my goals, but
  adds mobile build tooling on top of learning React itself.

## Consequences

- One codebase that runs on any phone or computer with a browser.
- Uses skills I already have and the React I want to learn.
- No app store: sharing the app is just sending a link.
- Less access to native phone features than a native app, which this app doesn't
  currently need.
