package com.senac.MusicShare.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.senac.MusicShare.entities.MusicEntity;
import com.senac.MusicShare.services.IMusicService;

@RestController
public class ControllerMusic {
	
	private static final Logger logger = LoggerFactory.getLogger(ControllerMusic.class);
	
	@Autowired
	IMusicService service;
	
	@GetMapping("/get-tracks")
	public ResponseEntity<List<MusicEntity>> getTracks() {
		logger.info("ControllerMusic - getTracks");
		
		List<MusicEntity> entities =  service.GetTracks();
		
		logger.info("ControllerMusic - getTracks: " + entities.size());
		if(entities.isEmpty()) {
			return ResponseEntity.ok(null);
		}
		
		return ResponseEntity.ok(entities);
	}
	
	@PostMapping("set-track")
	public ResponseEntity<String> setTrack(@RequestBody MusicEntity music) {
		
		int res = service.setMusic(music);
		
		if(res == 1)
			return ResponseEntity.ok("Inserido");
		
		return ResponseEntity.badRequest().body("Falha ao inserir");
				
	
	}
}
