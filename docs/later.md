# Later

This doc is a running lists of features that might come in a future version.
Inclusion here doesn't represent a concrete commitment to add a feature.

## Offline sync

Log sets at the gym with no signal and sync them when back online. Feel
confident I'll add this functionality eventually, just planning to evaluate
after using the app for a while.

## Tags on exercises

User-defined labels such as "upper", "cardio", "compound", or "isolation" that
can be used to filter the exercise list, group progress, or view analytics (e.g.
look at a chart grouped by tag instead of by exercise name). Need to decide
whether these would be free-form tags chosen by the user or picked from a fixed
set.

## Automatic progression for timed exercises

Exercises that are measured by a time count rather than by a chosen number of
reps/sets currently don't have any progression mechanism. I don't personally do
any exercises like this so it's not a pressing feature but it does get at the
core flexibility the app aspires toward, so worth considering.

## Progress charts

Charts of each a user's progress over time. Will be challenging to figure out
how to manage this kind of reporting across data types. Should aspire to develop
a basic version of this function at the very least (i.e. pie chart showing how
much of a user's program is "upper" exercises versus "lower" exercises).

## TypeScript

Convert the app from plain JavaScript to TypeScript as a learning opportunity
and to potentially catch bugs earlier.

## Hiding exercises

An exercise with logged sets can't be deleted, so its history keeps its name.
Over time the exercise list could fill with movements no longer used. A "hide"
option would keep the history but drop the exercise from pickers. It would also
free its name for reuse.
