package com.senac.MusicShare.services;

import java.util.List;
import org.springframework.stereotype.Service;

import com.senac.MusicShare.entities.MusicEntity;

@Service
public interface IMusicService {
	public List<MusicEntity> GetTracks();
	public int setMusic(MusicEntity music);
}
