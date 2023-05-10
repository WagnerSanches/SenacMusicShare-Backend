package com.senac.MusicShare.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.senac.MusicShare.entities.MusicEntity;
import com.senac.MusicShare.repositories.MusicRepository;

@Service
public class MusicService implements IMusicService {
	
	@Autowired
	MusicRepository repository;
	
	public List<MusicEntity> GetTracks() {
		return repository.findAllMusics();
	}

	public int setMusic(MusicEntity music) {
		MusicEntity res = repository.save(music);
		
		if(res != null) {
			return 1;
		}
		
		return 0;
	}
}
