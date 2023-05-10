package com.senac.MusicShare.entities;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "music_shared")
public class MusicEntity {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long id_shared;
	private String music_name;
	private String music_artists;
	private String music_image_url;
	private String spotify_url;
	private LocalDateTime time_posted;
	
	@PrePersist
	public void prePersist() {
		this.time_posted = LocalDateTime.now();
	}
	
	public MusicEntity() {
	}

	public MusicEntity(long id_shared, String music_name, String music_artists, String music_image_url,
			String spotify_url, LocalDateTime time_posted) {
		super();
		this.id_shared = id_shared;
		this.music_name = music_name;
		this.music_artists = music_artists;
		this.music_image_url = music_image_url;
		this.spotify_url = spotify_url;
		this.time_posted = time_posted;
	}
	
	public long getId_shared() {
		return id_shared;
	}

	public void setId_shared(long id_shared) {
		this.id_shared = id_shared;
	}

	public String getMusic_name() {
		return music_name;
	}

	public void setMusic_name(String music_name) {
		this.music_name = music_name;
	}

	public String getMusic_artists() {
		return music_artists;
	}

	public void setMusic_artists(String music_artists) {
		this.music_artists = music_artists;
	}

	public String getMusic_image_url() {
		return music_image_url;
	}

	public void setMusic_image_url(String music_image_url) {
		this.music_image_url = music_image_url;
	}

	public String getSpotify_url() {
		return spotify_url;
	}

	public void setSpotify_url(String spotify_url) {
		this.spotify_url = spotify_url;
	}

	public LocalDateTime getTime_posted() {
		return time_posted;
	}

	public void setTime_posted(LocalDateTime time_posted) {
		this.time_posted = time_posted;
	}
	
}
