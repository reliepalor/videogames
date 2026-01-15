import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { VideoGameService } from '../../../../core/services/videogame.service';

@Component({
  standalone: true,
  selector: 'app-videogame-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './videogame-form.component.html',
})
export class VideoGameFormComponent implements OnInit {

  private fb = inject(FormBuilder);
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private videoGameService = inject(VideoGameService);

  form!: FormGroup;
  isEdit = false;
  gameId: number | null = null;

  selectedFile?: File;
  previewUrl?: string;

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      platform: [''],
      developer: [''],
      publisher: [''],
      price: [0, [Validators.min(0)]],
      imageUrl: [''], // stores image URL for preview when editing
    });

    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEdit = true;
      this.gameId = +id;
      this.loadGame(this.gameId);
    }
  }

  loadGame(id: number): void {
    this.videoGameService.getById(id).subscribe({
      next: (game) => {
        this.form.patchValue({
          ...game,
          imageUrl: game.imageUrl ?? null, // set imageUrl for preview
        });
      },
      error: () => {
        this.router.navigate(['/videogames']);
      },
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.selectedFile = input.files[0];

    // Preview selected image
    const reader = new FileReader();
    reader.onload = () => this.previewUrl = reader.result as string;
    reader.readAsDataURL(this.selectedFile);
  }

  submit(): void {
    if (this.form.invalid) return;

    const formValues = this.form.getRawValue();
    console.log('Submitting form values:', formValues);
    console.log('Selected file:', this.selectedFile);

    // We need to send form data as FormData because backend expects [FromForm]
    const formData = new FormData();
    formData.append('Title', formValues.title);
    formData.append('Platform', formValues.platform ?? '');
    formData.append('Developer', formValues.developer ?? '');
    formData.append('Publisher', formValues.publisher ?? '');
    formData.append('Price', formValues.price.toString());

    if (this.selectedFile) {
      formData.append('Image', this.selectedFile, this.selectedFile.name);
    }

    let operation$;

    if (this.isEdit && this.gameId) {
      operation$ = this.videoGameService.update(this.gameId, formData);
    } else {
      operation$ = this.videoGameService.create(formData);
    }

    operation$.subscribe({
      next: () => {
        const message = this.isEdit
          ? 'Video game updated successfully'
          : 'Video game created successfully';
        localStorage.setItem('toast', JSON.stringify({ message, type: 'success' }));
        this.router.navigate(['/videogames']);
      },
      error: (error) => {
        console.error('Operation failed', error);
        // You can add toast here if needed
      }
    });
  }
}
