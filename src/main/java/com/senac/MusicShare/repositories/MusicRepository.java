package com.senac.MusicShare.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.senac.MusicShare.entities.MusicEntity;

@Repository
public interface MusicRepository extends JpaRepository<MusicEntity, Long> {
	@Query(nativeQuery = true, value = "SELECT * FROM music_shared e WHERE e.time_posted >= NOW() - INTERVAL '3 hour'")
	List<MusicEntity> findAllMusics();
}
