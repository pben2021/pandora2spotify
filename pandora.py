# #!/usr/bin/env python3
# # -*- coding: utf-8 -*-
# """
# Created on Wed Aug  4 15:36:58 2021

# @author: paula
# """
import spotipy
import sys


#function returns "My Pandora Thumbs" playlist id and true/false if playlist exists/doesn't as tuple
def get_playlist_id(token):
    spotify=spotipy.Spotify(auth=token)
    user_id = spotify.me()['id']

    limit = 50
    offset = 0

    total = spotify.current_user_playlists(limit=1)['total']
    #iterate through user playlists. even playlist exists, return its id
    i = 0
    while i < total:
        playlists = spotify.current_user_playlists(limit=limit, offset=offset)
        for playlist in playlists['items']:
            i+=1
            if playlist['name'] == 'My Pandora Thumbs Up':
                return playlist["id"], True
                
        offset+=50
    #else, create one and return id    
    playlist = spotify.user_playlist_create(user_id, 'My Pandora Thumbs Up', public = True, collaborative = False)
    return playlist["id"], False

#function returns list of song uris 
def get_uris(songs, token): #songs is list of tuples in (artist, song) format
    spotify=spotipy.Spotify(auth=token)

    uris = []
    for song in songs:
        artist = song[0]
        track = song[1]
        try:
            search = spotify.search(q='track:'+track+' artist:'+artist, type='track')
            uri = search['tracks']['items'][0]['uri']
            if uri not in uris:
                uris.append(uri)
        except Exception: #if artist and track query returns nothing, try just track name
            search = spotify.search(q=track, type='track') 
            for track in search['tracks']['items']:
                if track['artists'][0]['name'] == artist:
                    uris.append(track['uri'])
                    break         
        except:
            continue
    
    return uris

#functions adds songs to playlist
def add_to_playlist(playlist_id, uris, token):
    spotify=spotipy.Spotify(auth=token)
    user_id = spotify.me()['id']

    if playlist_id[1] is True:
        in_playlist = set()
        limit = 100
        offset = 0
        total = spotify.playlist_items(playlist_id[0], limit=1)['total']
        #add all songs in Pandora playlist to a set for set operation. Unfortunately only way to prevent duplicates using API :(
        i = 0
        while i < total:
            playlists = spotify.playlist_items(playlist_id[0], fields ='items(track(uri))', limit=limit, offset=offset)
            for playlist in playlists['items']:
                in_playlist.add(playlist['track']['uri'])
                i+=1

            offset += 100
        #make sure songs to add aren't already in playlist
        no_dupes = set(uris)-in_playlist

        if len(no_dupes) == 0: #no songs to add, do nothing
            return
        spotify.user_playlist_add_tracks(user_id, playlist_id[0], list(no_dupes), position=0)

    else:
        if len(uris) == 0: #no songs to add, do nothing
            return
        if len(uris) == 1:
            uris = [uris]
        spotify.user_playlist_add_tracks(user_id, playlist_id[0], uris)

def main():
    s = sys.argv[1] #gets server info as string 
    token = sys.argv[2]

    if s == 'create': #creat4e playlist first to prevent false falses from playlist_id return
        get_playlist_id(token)
    else:
        s = s.split('\"') #convert to a list
        if len(s) != 1:
            sometracks = [] #(artist,track)
            i = 3
            while i < len(s)-8:
                sometracks.append((s[i], s[i+8])) #add artist,track pair to sometracks
                i+=16
            playlist_id = get_playlist_id(token) #get id and existence boolean
            uris = get_uris(sometracks, token) #get uris for songs
            add_to_playlist(playlist_id, uris, token) #add songs to playlist
main()